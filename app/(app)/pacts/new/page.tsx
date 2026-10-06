import { NewPactForm } from "./NewPactForm";

export default function NewPact() {
  return (
    <div className="space-y-4">
      <h1 className="display text-4xl">New pact</h1>
      <p className="text-muted">Each of you sets a weekly goal and a stake. Every Monday the week closes. Miss your goal and you owe.</p>
      <NewPactForm />
    </div>
  );
}
