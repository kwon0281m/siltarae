import { createFileRoute } from "@tanstack/react-router";
import { NetworkApp } from "@/components/network-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <NetworkApp />;
}
