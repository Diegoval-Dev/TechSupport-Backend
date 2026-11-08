import os from 'os';
import { monitorEventLoopDelay, performance } from 'perf_hooks';
import { logger } from '../logger/logger';

const DEFAULT_INTERVAL_MS = 60_000;
const EVENT_LOOP_RESOLUTION_MS = 20;
const NS_PER_MS = 1e6;
const NS_PER_US = 1e3;

// Logs one ECS line per interval with CPU, memory and event-loop health of this process.
export const startProcessMetrics = (
  intervalMs = Number(process.env.PROCESS_METRICS_INTERVAL_MS) || DEFAULT_INTERVAL_MS,
) => {
  const loopDelay = monitorEventLoopDelay({ resolution: EVENT_LOOP_RESOLUTION_MS });
  loopDelay.enable();
  const cpuCount = os.availableParallelism();
  let lastCpu = process.cpuUsage();
  let lastTime = process.hrtime.bigint();
  let lastElu = performance.eventLoopUtilization();

  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    const elapsedUs = Number(now - lastTime) / NS_PER_US;
    const cpu = process.cpuUsage(lastCpu);
    const elu = performance.eventLoopUtilization(lastElu);
    const memory = process.memoryUsage();

    logger.info(
      {
        event: { category: 'process', action: 'process_metrics' },
        system: {
          process: {
            cpu: { total: { norm: { pct: (cpu.user + cpu.system) / elapsedUs / cpuCount } } },
            memory: { rss: { bytes: memory.rss } },
          },
        },
        nodejs: {
          memory: {
            heap: { used: { bytes: memory.heapUsed }, total: { bytes: memory.heapTotal } },
          },
          eventloop: {
            // The histogram includes the sampling interval itself, so subtract it.
            delay: {
              avg: { ms: Math.max(0, loopDelay.mean / NS_PER_MS - EVENT_LOOP_RESOLUTION_MS) },
              p99: {
                ms: Math.max(0, loopDelay.percentile(99) / NS_PER_MS - EVENT_LOOP_RESOLUTION_MS),
              },
            },
            utilization: { pct: elu.utilization },
          },
        },
      },
      'process metrics',
    );

    loopDelay.reset();
    lastCpu = process.cpuUsage();
    lastTime = now;
    lastElu = performance.eventLoopUtilization();
  }, intervalMs);
  timer.unref();
  return timer;
};
