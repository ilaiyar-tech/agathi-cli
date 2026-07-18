import { useQuery } from "@tanstack/react-query";
import * as backend from "../services/api";

type Gpu = {
  name?: string;
  memory_used?: number;
  memory_total?: number;
  utilization?: number;
  temperature?: number;
  power?: number;
};

type SystemResponse = {
  cpu?: { cores?: number; load?: number[] };
  memory?: { total?: number; free?: number };
  gpu?: Gpu | string;
  disk?: { ai?: boolean };
};

type NormalizedSystem = Omit<SystemResponse, "gpu"> & { gpu?: Gpu };

function number(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalize_system(data: SystemResponse | null): NormalizedSystem | null {
  if (!data) return null;
  if (typeof data.gpu !== "string") return { ...data, gpu: data.gpu as Gpu | undefined };

  const [name, memory_used, memory_total, utilization] = data.gpu.split(",").map(value => value.trim());

  return {
    ...data,
    gpu: {
      name: name || undefined,
      memory_used: number(memory_used),
      memory_total: number(memory_total),
      utilization: number(utilization)
    }
  };
}

export function use_dashboard() {
  return {
    system: useQuery({
      queryKey: ["system"],
      queryFn: () => backend.system().then(r => normalize_system(r.data))
    }),

    models: useQuery({
      queryKey: ["models"],
      queryFn: () => backend.models().then(r => r.data),
      refetchInterval: 10000 // Fallback slow polling
    }),

    active_model: useQuery({
      queryKey: ["active-model"],
      queryFn: () => backend.activeModel().then(r => r.data),
      refetchInterval: 10000 // Fallback slow polling
    }),

    active_provider: useQuery({
      queryKey: ["active-provider"],
      queryFn: () => backend.activeProvider().then(r => r.data)
    }),

    downloads: useQuery({
      queryKey: ["downloads"],
      queryFn: () => backend.getDownloads().then(r => r.data),
      initialData: []
    }),

    jobs: useQuery({
      queryKey: ["jobs"],
      queryFn: () => fetch("http://127.0.0.1:8100/jobs").then(r => r.json()),
      initialData: []
    }),

    queue: useQuery({
      queryKey: ["queue"],
      queryFn: () => fetch("http://127.0.0.1:8100/queue").then(r => r.json()),
      initialData: []
    }),

    logs: useQuery({
      queryKey: ["logs"],
      queryFn: () => Promise.resolve([]),
      initialData: []
    })
  };
}
