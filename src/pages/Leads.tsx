import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Eye } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

const stageLabels: Record<string, string> = {
  new_lead: 'Novo Lead',
  contact_made: 'Contato Feito',
  proposal_sent: 'Proposta Enviada',
  negotiation: 'Negociação',
  closed_won: 'Ganho',
  closed_lost: 'Perdido',
};

const statusLabels: Record<string, string> = {
  new: 'Novo',
  in_progress: 'Em andamento',
  won: 'Ganhou',
  lost: 'Perdido',
};

export default function Leads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Tables<'leads'>[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(searchParams.get('new') === 'true');
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', source: 'manual', notes: '', value: '' });

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('leads').insert({
      name: form.name,
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      source: form.source || 'manual',
      notes: form.notes || null,
      value: form.value ? parseFloat(form.value) : 0,
      created_by: user.id,
      assigned_to: user.id,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lead criado com sucesso!' });
      setForm({ name: '', company: '', phone: '', email: '', source: 'manual', notes: '', value: '' });
      setDialogOpen(false);
      fetchLeads();
    }
  }

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company?.toLowerCase().includes(search.toLowerCase())) ||
      (l.email?.toLowerCase().includes(search.toLowerCase()));
    const matchStage = stageFilter === 'all' || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm">{leads.length} leads cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="manual" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} />
              </div>
              <Button type="submit" className="w-full">Criar Lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, empresa ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas etapas</SelectItem>
                {Object.entries(stageLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="hidden lg:table-cell">Valor</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-accent/30">
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{lead.company || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{lead.email || lead.phone || '—'}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium">
                        {stageLabels[lead.stage]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {lead.value ? `R$ ${Number(lead.value).toLocaleString('pt-BR')}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link to={`/leads/${lead.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
