export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSyncScheduler, stopSyncScheduler } = await import(
      "@/lib/sync/orchestrator"
    );

    // Start the background sync scheduler
    startSyncScheduler();

    // Handle graceful shutdown
    const shutdown = () => {
      console.log("Received shutdown signal, cleaning up...");
      stopSyncScheduler();

      // Give in-progress sync up to 30 seconds to complete
      const timeout = setTimeout(() => {
        console.log("Shutdown timeout reached, forcing exit.");
        process.exit(0);
      }, 30000);

      // Check if sync is done every 500ms
      const check = setInterval(async () => {
        const { isSyncing } = await import("@/lib/sync/orchestrator");
        if (!isSyncing()) {
          clearInterval(check);
          clearTimeout(timeout);
          console.log("Clean shutdown complete.");
          process.exit(0);
        }
      }, 500);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
