import { AnyEvent, Folder, Page } from "@atrilabs/forest";
import { PagesDbSchema } from "@atrilabs/forest/lib/implementations/lowdb/types";

export interface ServerToClientEvents {
  newEvent: (
    forestPkgId: string,
    pageId: Page["id"],
    event: AnyEvent,
    // the socket id from which this event originated
    socketId: string
  ) => void;
}

export interface ClientToServerEvents {
  getMeta: (forestPkgId: string, callback: (meta: any) => void) => void;
  createFolder: (
    forestPkgId: string,
    folder: Folder,
    callback: (success: boolean) => void
  ) => void;
  updateFolder: (
    forestPkgId: string,
    id: Folder["id"],
    update: Partial<Omit<Folder, "id">>,
    callback: (success: boolean) => void
  ) => void;
  deleteFolder: (
    forestPkgId: string,
    id: Folder["id"],
    callback: (success: boolean) => void
  ) => void;
  getPages: (
    forestPkgId: string,
    callback: (page: PagesDbSchema) => void
  ) => void;
  createPage: (
    forestPkgId: string,
    page: Page,
    callback: (success: boolean) => void
  ) => void;
  updatePage: (
    forestPkgId: string,
    pageId: Page["id"],
    update: Partial<Omit<Page, "id">>,
    callback: (success: boolean) => void
  ) => void;
  deletePage: (
    forestPkgId: string,
    pageId: Page["id"],
    callback: (success: boolean) => void
  ) => void;

  fetchEvents: (
    forestPkgId: string,
    pageId: Page["id"],
    callback: (events: AnyEvent[]) => void
  ) => void;
  postNewEvent: (
    forestPkgId: string,
    pageId: Page["id"],
    event: AnyEvent,
    callback: (success: boolean) => void
  ) => void;
  getNewAlias: (
    forestPkgId: string,
    prefix: string,
    callback: (alias: string) => void
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {}