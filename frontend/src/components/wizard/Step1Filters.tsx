import React, { useState, useEffect, useMemo } from 'react';
import client from '../../api/client';
import { Loader2, Search, Calendar, Users, Briefcase } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  _links: {
    parent?: {
      href: string;
      title?: string;
    };
  };
}

const buildProjectTree = (projects: Project[]) => {
  const map: Record<number, any> = {};
  const roots: any[] = [];

  // Initialize
  projects.forEach(p => {
    map[p.id] = { ...p, children: [] };
  });

  // Link children to parents
  projects.forEach(p => {
    const parentHref = p._links.parent?.href;
    if (parentHref) {
      const parentId = parseInt(parentHref.split('/').pop() || '0');
      if (map[parentId]) {
        map[parentId].children.push(map[p.id]);
      } else {
        roots.push(map[p.id]); // Parent not in current list (maybe permission?)
      }
    } else {
      roots.push(map[p.id]);
    }
  });

  // Flatten with indentation
  const flattened: { id: number; name: string; level: number }[] = [];
  const traverse = (node: any, level: number) => {
    flattened.push({ id: node.id, name: node.name, level });
    // Sort children alphabetically
    node.children.sort((a: any, b: any) => a.name.localeCompare(b.name));
    node.children.forEach((child: any) => traverse(child, level + 1));
  };

  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach(root => traverse(root, 0));

  return flattened;
};

export const Step1Filters = ({ data, onNext }: { data: any; onNext: (filters: any, analysis: any) => void }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(data);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, uRes] = await Promise.all([
          client.get('/projects'),
          client.get('/users')
        ]);
        setProjects(pRes.data);
        setUsers(uRes.data);
      } catch (err) {
        setError('Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const projectTree = useMemo(() => buildProjectTree(projects), [projects]);

  const handleSearch = async () => {
    if (form.project_ids.length === 0) {
      setError('Please select at least one project');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const res = await client.post('/op/search', form);
      onNext(form, res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Briefcase size={16} /> Projects Hierarchy</label>
          <select 
            multiple
            className="w-full h-48 rounded-md border border-input bg-background px-1 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
            value={form.project_ids.map(String)}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (option) => Number(option.value));
              setForm({ ...form, project_ids: values });
            }}
          >
            {projectTree.map(p => (
              <option key={p.id} value={p.id} className="py-1">
                {"\u00A0".repeat(p.level * 4)}{p.level > 0 ? "— " : ""}{p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Projects are shown in their tree structure. Use Ctrl/Cmd to select multiple.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><Users size={16} /> Filter by User (Optional)</label>
            <select 
               className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               value={form.user_id || ''}
               onChange={(e) => setForm({ ...form, user_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">All Users</option>
              {users.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar size={16} /> From</label>
              <input 
                type="date"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar size={16} /> To</label>
              <input 
                type="date"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8"
        >
          {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search size={18} className="mr-2" />}
          Search All Pages
        </button>
      </div>
    </div>
  );
};
