import { createApp, server } from "@databricks/appkit";

await createApp({
  plugins: [server()],
});
