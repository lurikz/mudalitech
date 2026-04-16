import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<(Tables<'tasks'> & { lead_name?: string })[]>([]);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({ title: '', description: '', due_date: '', lead_id: '', priority: 'medium' });

  useEffect(() => {
    fetchTasks();
    fetchLeads();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, leads(name)')
      .order('due_date', { ascending: true });
    setTasks(
      (data || []).map((t: any) => ({
        ...t,
        lead_name: t.leads?.name || null,
      }))
    );
  }

  async function fetchLeads() {
    const { data } = await supabase.from('leads').select('id, name').order('name');
    setLeads(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      lead_id: form.lead_id || null,
      priority: form.priority,
      assigned_to: user.id,
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tarefa criada!' });
      setForm({ title: '', description: '', due_date: '', lead_id: '', priority: 'medium' });
      setDialogOpen(false);
      fetchTasks();
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    fetchTasks();
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const priorityColors: Record<string, string> = {
    high: 'text-destructive',
    medium: 'text-warning',
    low: 'text-muted-foreground',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground text-sm">{tasks.filter((t) => t.status === 'pending').length} pendentes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Tarefa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lead vinculado</Label>
                <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Criar Tarefa</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'completed'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Concluídas'}
          </Button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma tarefa encontrada
            </CardContent>
          </Card>
        ) : (
          filtered.map((task) => (
            <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => toggleTask(task.id, task.status)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {task.lead_name && (
                      <Link to={`/leads/${task.lead_id}`} className="text-xs text-primary hover:underline">
                        {task.lead_name}
                      </Link>
                    )}
                    <span className={`text-xs flex items-center gap-1 ${priorityColors[task.priority]}`}>
                      <AlertCircle className="h-3 w-3" />
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
