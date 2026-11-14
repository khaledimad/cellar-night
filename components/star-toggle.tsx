import {
  starComedianAction,
  unstarComedianAction,
} from "@/app/actions/favourites";

// A star beside a name. Works as a plain form, no client code needed.
export function StarToggle({
  comedianId,
  name,
  starred,
}: {
  comedianId: number;
  name: string;
  starred: boolean;
}) {
  const action = (starred ? unstarComedianAction : starComedianAction).bind(
    null,
    comedianId,
  );
  return (
    <form action={action} className="inline">
      <button
        type="submit"
        aria-label={starred ? `Unstar ${name}` : `Star ${name}`}
        aria-pressed={starred}
        className={`px-1 text-lg leading-none ${
          starred ? "text-amber-500" : "text-zinc-400 hover:text-amber-500"
        }`}
      >
        {starred ? "★" : "☆"}
      </button>
    </form>
  );
}
