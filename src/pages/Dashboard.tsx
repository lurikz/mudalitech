import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, TrendingUp, DollarSign, Plus, Kanban, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  totalLeads: number;
  newToday: number;
  inProgress: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    newToday: 0,
    inProgress: 0,
    conversionRate: 0,
    estimatedRevenue: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentLeads();
  }, []);

  async function fetchStats() {
    const { data: leads } = await supabase.from('leads').select('*');
    if (!leads) return;

    const today = new Date().toISOString().split('T')[0];
    const newToday = leads.filter((l) => l.created_at.startsWith(today)).length;
    const inProgress = leads.filter((l) => !['closed_won', 'closed_lost'].includes(l.stage)).length;
    const won = leads.filter((l) => l.stage === 'closed_won').length;
    const rate = leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;
    const revenue = leads.filter((l) => l.stage === 'closed_won').reduce((sum, l) => sum + (l.value || 0), 0);

    setStats({ totalLeads: leads.length, newToday, inProgress, conversionRate: rate, estimatedRevenue: revenue });
  }

  async function fetchRecentLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentLeads(data || []);
  }

  const statCards = [
    { label: 'Total de Leads', value: stats.totalLeads, icon: Users, color: 'text-primary' },
    { label: 'Novos Hoje', value: stats.newToday, icon: UserPlus, color: 'text-info' },
    { label: 'Em Andamento', value: stats.inProgress, icon: TrendingUp, color: 'text-warning' },
    { label: 'Taxa Conversão', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-success' },
    { label: 'Receita Estimada', value: `R$ ${stats.estimatedRevenue.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-success' },
  ];

  const stageLabels: Record<string, string> = {
    new_lead: 'Novo Lead',
    contact_made: 'Contato Feito',
    proposal_sent: 'Proposta Enviada',
    negotiation: 'Negociação',
    closed_won: 'Ganho',
    closed_lost: 'Perdido',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do seu CRM</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/leads?new=true">
              <Plus className="h-4 w-4 mr-1" /> Novo Lead
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/pipeline">
              <Kanban className="h-4 w-4 mr-1" /> Ver Funil
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">Leads Recentes</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/leads" className="text-primary">
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhum lead cadastrado ainda. Crie seu primeiro lead!
            </p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.company || lead.email || '—'}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium">
                    {stageLabels[lead.stage] || lead.stage}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
