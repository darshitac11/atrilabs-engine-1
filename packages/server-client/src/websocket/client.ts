import { BrowserClient } from "@atrilabs/core";
import { AnyEvent, Folder, Page, PageDetails } from "@atrilabs/forest";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./types";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  process.env["ATRI_TOOL_EVENT_SERVER_CLIENT"] as string
);

function getMeta(forestPkgId: string, onData: (meta: any) => void) {
  socket.emit("getMeta", forestPkgId, onData);
}

function getPages(
  forestPkgId: string,
  onData: (pages: { [pageId: string]: PageDetails }) => void
) {
  socket.emit("getPages", forestPkgId, onData);
}

function createFolder(
  forestPkgId: string,
  folder: Folder,
  callback: (success: boolean) => void
) {
  socket.emit("createFolder", forestPkgId, folder, callback);
}

function updateFolder(
  forestPkgId: string,
  id: string,
  update: Partial<Omit<Folder, "id">>,
  callback: (success: boolean) => void
) {
  socket.emit("updateFolder", forestPkgId, id, update, callback);
}

function createPage(
  forestPkgId: string,
  page: Page,
  callback: (success: boolean) => void
) {
  socket.emit("createPage", forestPkgId, page, callback);
}

function updatePage(
  forestPkgId: string,
  id: string,
  update: Partial<Omit<Page, "id">>,
  callback: (success: boolean) => void
) {
  socket.emit("updatePage", forestPkgId, id, update, callback);
}

function deletePage(
  forestPkgId: string,
  id: string,
  callback: (success: boolean) => void
) {
  socket.emit("deletePage", forestPkgId, id, callback);
}

function deleteFolder(
  forestPkgId: string,
  id: string,
  callback: (success: boolean) => void
) {
  socket.emit("deleteFolder", forestPkgId, id, callback);
}

async function fetchEvents(forestPkgId: string, pageId: string) {
  return new Promise<AnyEvent[]>((res) => {
    socket.emit("fetchEvents", forestPkgId, pageId, (events) => {
      res(events);
    });
  });
}

function postNewEvent(
  forestPkgId: string,
  pageId: string,
  event: AnyEvent,
  callback: (success: boolean) => void
) {
  socket.emit("postNewEvent", forestPkgId, pageId, event, callback);
}

function getNewAlias(
  forestPkgId: string,
  prefix: string,
  callback: (alias: string) => void
) {
  socket.emit("getNewAlias", forestPkgId, prefix, callback);
}

type EventSubscriber = (
  forestPkgId: string,
  pageId: string,
  event: AnyEvent
) => void;
const eventSubscribers: EventSubscriber[] = [];
function subscribeEvents(cb: EventSubscriber) {
  eventSubscribers.push(cb);
  return () => {
    const index = eventSubscribers.findIndex((curr) => curr === cb);
    if (index >= 0) {
      eventSubscribers.splice(index, 1);
    }
  };
}
const externalEventSubscribers: EventSubscriber[] = [];
function subscribeExternalEvents(cb: EventSubscriber) {
  externalEventSubscribers.push(cb);
  return () => {
    const index = externalEventSubscribers.findIndex((curr) => curr === cb);
    if (index >= 0) {
      externalEventSubscribers.splice(index, 1);
    }
  };
}
const ownEventSubscribers: EventSubscriber[] = [];
function subscribeOwnEvents(cb: EventSubscriber) {
  ownEventSubscribers.push(cb);
  return () => {
    const index = ownEventSubscribers.findIndex((curr) => curr === cb);
    if (index >= 0) {
      ownEventSubscribers.splice(index, 1);
    }
  };
}
socket.on("newEvent", (forestPkgId, pageId, event, socketId) => {
  eventSubscribers.forEach((cb) => cb(forestPkgId, pageId, event));
  if (socketId !== socket.id) {
    externalEventSubscribers.forEach((cb) => cb(forestPkgId, pageId, event));
  }
  if (socketId === socket.id) {
    ownEventSubscribers.forEach((cb) => cb(forestPkgId, pageId, event));
  }
});

const client: BrowserClient = {
  getMeta,
  getPages,
  createFolder,
  updateFolder,
  createPage,
  updatePage,
  deletePage,
  deleteFolder,
  fetchEvents,
  postNewEvent,
  subscribeEvents,
  subscribeExternalEvents,
  subscribeOwnEvents,
  getNewAlias,
};

export default client;