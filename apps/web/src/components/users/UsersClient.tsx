'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserPublic } from '@/types';

interface FormState {
  name: string;
  key: string;
  model: string;
  allowedModels: string;
}

const emptyForm: FormState = { name: '', key: '', model: '', allowedModels: '' };

export function UsersClient() {
  const { data: users, isLoading, mutate } = useUsers();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserPublic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function generateKey() {
    try {
      const { key } = await apiClient.users.generateKey();
      setForm((f) => ({ ...f, key }));
    } catch {
      toast.error('Erro ao gerar chave');
    }
  }

  function openAdd() {
    setEditUser(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(user: UserPublic) {
    setEditUser(user);
    setForm({
      name: user.name,
      key: '',
      model: user.model ?? '',
      allowedModels: user.allowedModels.join(', '),
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Campo 'Nome' obrigatório");
      return;
    }
    if (!editUser && !form.key.trim()) {
      toast.error("Campo 'API Key' obrigatório");
      return;
    }
    setSaving(true);
    try {
      const allowedModels = form.allowedModels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editUser) {
        await apiClient.users.update(editUser.id, {
          name: form.name,
          model: form.model || null,
          allowedModels,
          active: editUser.active,
        });
        toast.success('Usuário atualizado');
      } else {
        await apiClient.users.add({
          name: form.name,
          key: form.key,
          model: form.model || null,
          allowedModels,
        });
        toast.success('Usuário criado');
      }
      await mutate();
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(user: UserPublic) {
    try {
      await apiClient.users.update(user.id, { active: !user.active });
      await mutate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.users.remove(id);
      await mutate();
      toast.success('Usuário removido');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários e API keys</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Criar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Modelo padrão</th>
                <th className="px-4 py-3 text-left font-medium">Ativo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {user.keyPreview}
                  </td>
                  <td className="px-4 py-3">
                    {user.model ? (
                      <code className="text-xs">{user.model}</code>
                    ) : (
                      <span className="text-muted-foreground text-xs">padrão do servidor</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={user.active}
                      onCheckedChange={() => handleToggle(user)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? 'Editar Usuário' : 'Criar Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                placeholder="minha-equipe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            {!editUser && (
              <div>
                <Label>API Key *</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    placeholder="gw_..."
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    className="font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={generateKey} title="Gerar chave">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div>
              <Label>Modelo padrão</Label>
              <Input
                placeholder="openai:gpt-4o-mini"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label>Modelos permitidos (separados por vírgula)</Label>
              <Input
                placeholder="openai:gpt-4o, anthropic:claude-3-5-sonnet-20241022"
                value={form.allowedModels}
                onChange={(e) => setForm({ ...form, allowedModels: e.target.value })}
                className="mt-1.5 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Vazio = apenas o modelo padrão
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editUser ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
