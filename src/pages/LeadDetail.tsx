import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Trash2, Save } from 'lucide-react';
import type { Tables, Enums } from '@/integrations/supabase/types';

const stageLabels: Record<string, string> = {
  new_lead: 'Novo Lead',
  contact_made: 'Contato Feito',
  proposal_sent: 'Proposta Enviada',
  negotiation: 'Negociação',
  closed_won: 'Ganho',
  closed_lost: 'Perdido',
};

const stageOrder: Enums<'lead_stage'>[] = ['new_lead', 'contact_made', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<Tables<'leads'> | null>(null);
  const [interactions, setInteractions] = useState<Tables<'lead_interactions'>[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (id) {
      fetchLead();
      fetchInteractions();
    }
  }, [id]);

  async function fetchLead() {
    const { data } = await supabase.from('leads').select('*').eq('id', id!).single();
    if (data) {
      setLead(data);
      setForm(data);
    }
  }

  async function fetchInteractions() {
    const { data } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', id!)
      .order('created_at', { ascending: false });
    setInteractions(data || []);
  }

  async function handleSave() {
    const { error } = await supabase.from('leads').update({
      name: form.name,
      company: form.company,
      phone: form.phone,
      email: form.email,
      source: form.source,
      notes: form.notes,
      value: form.value,
      stage: form.stage,
      status: form.status,
    }).eq('id', id!);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lead atualizado!' });
      setEditing(false);
      fetchLead();
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !user) return;
    const { error } = await supabase.from('lead_interactions').insert({
      lead_id: id!,
      user_id: user.id,
      type: 'note',
      description: newNote.trim(),
    });
    if (!error) {
      setNewNote('');
      fetchInteractions();
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    await supabase.from('leads').delete().eq('id', id!);
    toast({ title: 'Lead excluído' });
    navigate('/leads');
  }

  async function handleMoveStage(stage: Enums<'lead_stage'>) {
    await supabase.from('leads').update({ stage }).eq('id', id!);
    fetchLead();
    toast({ title: `Movido para ${stageLabels[stage]}` });
  }

  if (!lead) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">{lead.company || ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancelar' : 'Editar'}
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Stage navigation */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {stageOrder.map((stage) => (
              <Button
                key={stage}
                variant={lead.stage === stage ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMoveStage(stage)}
                className="text-xs"
              >
                {stageLabels[stage]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead info */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={200} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={200} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={form.value || ''} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} />
                </div>
                <Button onClick={handleSave} className="w-full">
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Empresa" value={lead.company} />
                <InfoRow label="Telefone" value={lead.phone} />
                <InfoRow label="Email" value={lead.email} />
                <InfoRow label="Origem" value={lead.source} />
                <InfoRow label="Valor" value={lead.value ? `R$ ${Number(lead.value).toLocaleString('pt-BR')}` : null} />
                <InfoRow label="Etapa" value={stageLabels[lead.stage]} />
                <InfoRow label="Criado em" value={new Date(lead.created_at).toLocaleDateString('pt-BR')} />
                {lead.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                maxLength={1000}
              />
              <Button size="icon" onClick={handleAddNote}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma interação registrada</p>
              ) : (
                interactions.map((i) => (
                  <div key={i.id} className="p-3 rounded-lg bg-accent/30 border border-border/50">
                    <p className="text-sm text-foreground">{i.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(i.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}
