-- ============================================================
-- Gebirah Simulation Database Schema
-- ============================================================
-- This creates the tables in Supabase to store simulation results.
-- When a user runs the simulation, the results are saved here
-- so they can be retrieved later without re-running.
-- ============================================================

-- Table 1: simulation_runs
-- Stores metadata about each experiment run
-- (who ran it, when, what settings they used)
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  willingness_scenario TEXT NOT NULL CHECK (willingness_scenario IN ('conservative', 'likely', 'optimistic')),
  num_runs INTEGER NOT NULL DEFAULT 20,
  start_month TEXT NOT NULL DEFAULT 'Jun',
  simulation_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Table 2: experiment_results
-- Stores the averaged results for each algorithm within a run
-- (one row per algorithm per simulation_run)
CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL CHECK (algorithm IN ('fifo', 'priority', 'weightOptimised')),
  avg_summary JSONB NOT NULL,        -- averaged SummaryMetrics across all runs
  confidence_intervals JSONB NOT NULL, -- 95% CI for key metrics
  avg_daily_metrics JSONB NOT NULL,   -- averaged DailyMetrics[] (day 1-30)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 3: scenario_outputs
-- Stores the complete JSON output for each scenario
-- (the full ScenarioOutput object, for download/export)
CREATE TABLE IF NOT EXISTS scenario_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  output_json JSONB NOT NULL,         -- the complete ScenarioOutput
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (required by Supabase)
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_outputs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write (since this is a student project, no auth needed)
CREATE POLICY "Allow anonymous access" ON simulation_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access" ON experiment_results
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access" ON scenario_outputs
  FOR ALL USING (true) WITH CHECK (true);
