"use client";
import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Clock, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Task {
  id: number;
  title: string;
  client: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
}

export default function TaskModal({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks/" + taskId)
      .then(r => r.json())
      .then(d => { setTask(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [taskId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Задача</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4"/></Button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400"/></div>
          ) : task ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
              {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
              {task.client && <p className="text-sm text-gray-500">Клиент: {task.client}</p>}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${task.priority === "Высокий" ? "bg-red-100 text-red-700" : task.priority === "Средний" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                  <AlertCircle className="w-3 h-3 inline mr-1"/>{task.priority}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${task.status === "Завершено" ? "bg-blue-50 text-blue-600" : "bg-green-100 text-green-700"}`}>
                  {task.status === "Завершено" ? <CheckSquare className="w-3 h-3 inline mr-1"/> : <Clock className="w-3 h-3 inline mr-1"/>}{task.status}
                </span>
              </div>
              {task.due_date && <p className="text-xs text-gray-400">Срок: {new Date(task.due_date).toLocaleString("ru-RU")}</p>}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Задача не найдена</p>
          )}
        </div>
        <div className="border-t p-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  );
}
