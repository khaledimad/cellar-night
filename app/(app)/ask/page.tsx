import { Chat } from "./chat";

export default function AskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ask the Cellar</h1>
      <Chat />
    </div>
  );
}
