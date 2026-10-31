import { useContentList, ContentListState } from "@/content/useContentList";
export function useDevotionals(editorial, revision) {
  return useContentList(
    "/api/v1/" + (editorial ? "admin/" : "") + "devotionals",
    revision,
    !editorial,
  );
}
export function DevotionalListState({ state }) {
  return <ContentListState state={state} label="Loading devotionals…" />;
}
