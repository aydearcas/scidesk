// What a computer keeps about a project, outside the project folder (R26): in the app's
// data folder (%APPDATA%\SciDesk\projects\<project id>\state.json on Windows,
// ~/Library/Application Support/SciDesk/projects/<project id>/state.json on macOS).
// Never synchronised: losing it costs a recomputation, never work.
import Type from "typebox";
import { DateTime, SchemaVersion, Strict, Uuid } from "./common.ts";

export const LocalProjectState = Strict({
  schemaVersion: SchemaVersion,
  project: Uuid,
  paths: Type.Array(Strict({ path: Type.String(), lastOpened: DateTime }), {
    description: "Where this computer has seen the project. Two live folders with the same id mean a copy: SciDesk asks and gives the copy a new id.",
  }),
  zotero: Type.Optional(Strict({
    serverId: Type.String({ description: "Zotero-Server-ID of this computer's Zotero (record 0027)." }),
    libraryVersion: Type.Integer({ minimum: 0 }),
    items: Type.Record(Type.String({ pattern: "^[23456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{8}$" }), Type.Integer({ minimum: 0 }), { description: "Version of each item when it was last read." }),
  })),
  window: Type.Optional(Type.Unknown({ description: "Open tabs, panels, scroll positions: free form, owned by the interface." })),
}, { title: "SciDesk local state of a project (app data folder)" });

export type LocalProjectStateFile = Type.Static<typeof LocalProjectState>;
