import { Suspense } from "react";
import { ComedianSearch } from "@/components/comedian-search";
import { MyShowList } from "@/components/my-show-list";
import { getCurrentUser } from "@/components/session";
import { StarToggle } from "@/components/star-toggle";
import { StarredChips } from "@/components/starred-chips";
import { getTopComedians } from "@/lib/queries/comedians";
import { getStarred } from "@/lib/queries/favourites";
import { getMyShows } from "@/lib/queries/shows";

export default function MyComediansPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">My comedians</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading</p>}>
        <MyComedians />
      </Suspense>
    </div>
  );
}

async function MyComedians() {
  const user = await getCurrentUser();
  const [starred, top, shows] = await Promise.all([
    getStarred(user.id),
    getTopComedians(),
    getMyShows(user.id),
  ]);

  return (
    <>
      <ComedianSearch
        top={top}
        starredIds={starred.map((c) => c.id)}
        secretStarred={starred.some((c) => c.nameNorm === "super secret pop up")}
      />

      {starred.length === 0 ? (
        <section className="flex flex-col gap-3">
          <p>
            Star a comedian to see the shows they are on and get an email when
            they are added to a lineup.
          </p>
          {top.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                On the most shows this week
              </h2>
              <ul className="flex flex-col">
                {top.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span>{c.name}</span>
                    <StarToggle comedianId={c.id} name={c.name} starred={false} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <>
          <StarredChips starred={starred} />
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Your comedians are on</h2>
            <MyShowList shows={shows} />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We email you when one of them is added to a lineup.
            </p>
          </section>
        </>
      )}
    </>
  );
}
