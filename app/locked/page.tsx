import Button from "../components/Button";

export default function Locked() {
  return (
    <form action={"/"} method="get" className="flex flex-col gap-2 p-8">
      <label htmlFor="code" className="text-center">
        Access code
      </label>
      <input id="code" name="code" type="password" required className="p-2 border rounded-2xl" />
      <Button type="submit">Enter</Button>
    </form>
  );
}
