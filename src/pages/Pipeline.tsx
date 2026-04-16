import { useEffect, useState, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import type { Tables, Enums } from '@/integrations/supabase/types';

const columns: { key: Enums<'lead_stage'>; label: string; color: string }[] = [
  { key: 'new_lead', label: 'Novo Lead', color: 'bg-info/10 border-info/30' },
  { key: 'contact_made', label: 'Contato Feito', color: 'bg-primary/10 border-primary/30' },
  { key: 'proposal_sent', label: 'Proposta Enviada', color: 'bg-warning/10 border-warning/30' },
  { key: 'negotiation', label: 'Negociação', color: 'bg-accent border-accent-foreground/20' },
  { key: 'closed_won', label: 'Ganho', color: 'bg-success/10 border-success/30' },
  { key: 'closed_lost', label: 'Perdido', color: 'bg-destructive/10 border-destructive/30' },
];

export default function Pipeline() {
  const [leads, setLeads] = useState<Tables<'leads'>[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data } = await supabase.from('leads').select('*').order('updated_at', { ascending: false });
    setLeads(data || []);
  }

  function onDragStart(e: DragEvent, leadId: string) {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggingId(leadId);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function onDrop(e: DragEvent, stage: Enums<'lead_stage'>) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDraggingId(null);

    const { error } = await supabase.from('leads').update({ stage }).eq('id', leadId);
    if (error) {
      toast({ title: 'Erro ao mover', description: error.message, variant: 'destructive' });
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Funil de Vendas</h1>
        <p className="text-muted-foreground text-sm">Arraste os cards entre as etapas</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.key);
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-72"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.key)}
            >
              <div className={`rounded-xl border p-3 ${col.color} h-full`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
                  <span className="text-xs bg-background/80 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                    {colLeads.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      to={`/leads/${lead.id}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`block p-3 rounded-lg bg-card border border-border/50 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                        draggingId === lead.id ? 'opacity-50' : ''
                      }`}
                    >
                      <p className="font-medium text-sm text-foreground">{lead.name}</p>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {lead.email || lead.phone || '—'}
                        </span>
                        {lead.value && Number(lead.value) > 0 && (
                          <span className="text-xs font-medium text-success">
                            R$ {Number(lead.value).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
