ALTER TABLE public.recon_map_nodes
  ADD COLUMN IF NOT EXISTS impact text,
  ADD COLUMN IF NOT EXISTS details text;

CREATE INDEX IF NOT EXISTS idx_recon_map_nodes_map_id ON public.recon_map_nodes(map_id);
CREATE INDEX IF NOT EXISTS idx_recon_maps_user_target ON public.recon_maps(user_id, target);