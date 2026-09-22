import React, { useState } from "react";
import {
  Plus,
  FolderGit2,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  AlertCircle,
  X,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import type { Project } from "../../types/project";

interface ProjectManagerProps {
  onSelectProject?: (project: Project) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onSelectProject }) => {
  const {
    projects,
    activeProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    clearError,
  } = useProjectStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setName("");
    setDescription("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setName(proj.name);
    setDescription(proj.description || "");
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createProject({ name: name.trim(), description: description.trim() || undefined });
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!name.trim()) {
      setFormError("Project name cannot be empty.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await updateProject(editingProject.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setEditingProject(null);
    } catch (err: any) {
      setFormError(err.message || "Failed to update project.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to soft-delete this project workspace?")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteProject(id);
    } catch (err: any) {
      alert(err.message || "Failed to delete project.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (proj: Project) => {
    setActiveProject(proj);
    if (onSelectProject) {
      onSelectProject(proj);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Project Workspaces</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1e2336] text-indigo-400 border border-[#2b324c]">
              {projects.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tenant-isolated workspaces for repository architecture mapping and dependency telemetry.
          </p>
        </div>

        <button
          id="btn-create-project"
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all border border-indigo-400/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Project Workspace</span>
        </button>
      </div>

      {/* Global Error Banner if any */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Projects Grid / Empty State */}
      {isLoading && projects.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-mono">Loading workspace hierarchy...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 px-6 rounded-2xl border border-dashed border-[#232738] bg-[#10121a]/50 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <FolderGit2 className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">No Project Workspaces Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mb-6">
            Create your first tenant workspace to start ingesting GitHub repositories, parsing AST symbols, and
            visualizing blast radius metrics.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const isDeleting = deletingId === project.id;

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                onClick={() => handleSelect(project)}
                className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "bg-[#141724] border-indigo-500/60 shadow-xl shadow-indigo-950/40"
                    : "bg-[#11131b] border-[#1d202d] hover:border-[#2b3044] hover:bg-[#131622]"
                }`}
              >
                <div>
                  {/* Card top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                            : "bg-[#1a1d2b] text-indigo-400 border border-[#272b3f]"
                        }`}
                      >
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center space-x-2">
                          <span>{project.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              ACTIVE
                            </span>
                          )}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          <span>{new Date(project.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        title="Edit Project"
                        onClick={(e) => openEditModal(project, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2334] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Soft Delete Project"
                        disabled={isDeleting}
                        onClick={(e) => handleDelete(project.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Project Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {project.description || "No project description provided."}
                  </p>
                </div>

                {/* Card footer metadata */}
                <div className="pt-3 border-t border-[#1a1d2a] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{project.repository_count} Repositories</span>
                  </div>

                  <span className="text-[11px] font-medium text-indigo-400 group-hover:text-indigo-300 inline-flex items-center space-x-1">
                    <span>Open Workspace</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#11131b] border border-[#232738] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Create Project Workspace</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1d2b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Workspace Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Core Microservices, Mobile Backend"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Brief description of the repositories and scope for this workspace..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1a1d2b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Workspace</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#11131b] border border-[#232738] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Edit Workspace Metadata</h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1d2b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Workspace Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1a1d2b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
