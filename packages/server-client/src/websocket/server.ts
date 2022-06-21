import { ToolConfig } from "@atrilabs/core";
import { Server } from "socket.io";
import { createForestMgr } from "./create-forest-mgr";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";
import { reversePageMap } from "./utils";

import http from "http";
const server = http.createServer();

export type EventServerOptions = {
  port?: number;
};

export default function (toolConfig: ToolConfig, options: EventServerOptions) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, { cors: { origin: "*" } });

  // create one directory and event manager for each of forest
  const getEventManager = createForestMgr(toolConfig).getEventManager;

  function getMeta(forestPkgId: string) {
    const eventManager = getEventManager(forestPkgId)!;
    const meta = eventManager.meta();
    // a flag to indicate update of meta
    let initMeta = false;
    if (meta["folders"] === undefined) {
      meta["folders"] = { root: { id: "root", name: "/", parentId: "" } };
      initMeta = true;
    }
    if (meta["pages"] === undefined) {
      // make home a direct child of root
      meta["pages"] = { home: "root" };
      initMeta = true;
    }
    if (meta["pages"] && meta["pages"]["home"] !== "root") {
      meta["pages"]["home"] = "root";
      initMeta = true;
    }
    if (initMeta) {
      eventManager.updateMeta(meta);
    }
    return meta;
  }

  function getPages(forestPkgId: string) {
    const eventManager = getEventManager(forestPkgId)!;
    const pages = eventManager.pages();
    if (pages["home"] === undefined) {
      // create home page if not already created
      eventManager.createPage("home", "Home", "/");
    }
    return eventManager.pages();
  }

  // this will ensure that home page is created with proper meta set
  function initialLoadForest(forestPkgId: string) {
    getMeta(forestPkgId);
    getPages(forestPkgId);
  }

  io.on("connection", (socket) => {
    socket.on("getMeta", (forestPkgId, callback) => {
      try {
        initialLoadForest(forestPkgId);
        const meta = getMeta(forestPkgId);
        callback(meta);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in getMeta message handler`
        );
        console.log(err);
      }
    });
    socket.on("getPages", (forestPkgId, callback) => {
      try {
        initialLoadForest(forestPkgId);
        const pages = getPages(forestPkgId);
        callback(pages);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in getPages message handler`
        );
        console.log(err);
      }
    });
    socket.on("createFolder", (forestPkgId, folder, callback) => {
      try {
        if (getEventManager(forestPkgId)) {
          const meta = getMeta(forestPkgId);
          meta["folders"][folder.id] = folder;
          getEventManager(forestPkgId)!.updateMeta(meta);
          callback(true);
        } else {
          callback(false);
        }
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in createFolder message handler`
        );
        console.log(err);
      }
    });
    socket.on("createPage", (forestPkgId, page, callback) => {
      try {
        if (getEventManager(forestPkgId)) {
          const meta = getMeta(forestPkgId);
          // folder should exist already
          if (meta["folders"][page.folderId]) {
            const foldername = meta["folders"][page.folderId]!.name;
            // TODO: route must follow the hierarchy of folders, not just the immidiate folder
            let route = `/${foldername}/${page.name}`;
            if (foldername === "/") route = `/${page.name}`;
            meta["pages"][page.id] = page.folderId;
            getEventManager(forestPkgId)!.updateMeta(meta);
            getEventManager(forestPkgId)!.createPage(page.id, page.name, route);
            callback(true);
          } else {
            callback(false);
          }
        }
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in createPage message handler`
        );
        console.log(err);
      }
    });
    socket.on("updateFolder", (forestPkgId, id, update, callback) => {
      try {
        const eventManager = getEventManager(forestPkgId)!;
        const meta = eventManager.meta();
        if (meta["folders"][id]) {
          meta["folders"][id] = { ...meta["folders"][id]!, ...update };
          eventManager.updateMeta(meta);
          callback(true);
        } else callback(false);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in udpateFolder message handler`
        );
        console.log(err);
      }
    });
    socket.on("updatePage", (forestPkgId, id, update, callback) => {
      try {
        const eventManager = getEventManager(forestPkgId)!;
        if (update.folderId) {
          const meta = eventManager.meta();
          meta["pages"][id] = update.folderId;
          eventManager.updateMeta(meta);
        }
        if (update.name) {
          eventManager.renamePage(id, update.name);
        }
        callback(true);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in updatePage message handler`
        );
        console.log(err);
      }
    });
    socket.on("deleteFolder", (forestPkgId, id, callback) => {
      try {
        const eventManager = getEventManager(forestPkgId)!;
        const meta = eventManager.meta();
        const folders = meta["folders"];
        if (folders[id]) {
          // delete from meta.json
          const pageMap = meta["pages"];
          const pageMapRev = reversePageMap(pageMap);
          if (pageMapRev[id]) {
            const pages = pageMapRev[id];
            pages?.forEach((page) => {
              delete meta["pages"][page];
            });
          }
          delete meta["folders"][id];
          eventManager.updateMeta(meta);
          // delete file events/xxx-pageid.json
          eventManager.deletePage(id);
          callback(true);
        } else {
          callback(false);
        }
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in deleteFolder message handler`
        );
        console.log(err);
      }
    });
    socket.on("deletePage", (forestPkgId, id, callback) => {
      try {
        const eventManager = getEventManager(forestPkgId)!;
        const meta = eventManager.meta();
        if (meta["pages"][id]) {
          delete meta["pages"][id];
          eventManager.updateMeta(meta);
          eventManager.deletePage(id);
          callback(true);
        } else {
          callback(false);
        }
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in deletePage message handler`
        );
        console.log(err);
      }
    });

    socket.on("fetchEvents", (forestPkgId, pageId, callback) => {
      try {
        initialLoadForest(forestPkgId);
        const eventManager = getEventManager(forestPkgId);
        const events = eventManager.fetchEvents(pageId);
        callback(events);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in fetchEvents message handler`
        );
        console.log(err);
      }
    });
    socket.on("postNewEvent", (forestPkgId, pageId, event, callback) => {
      try {
        const eventManager = getEventManager(forestPkgId);
        eventManager.storeEvent(pageId, event);
        callback(true);
        // send this event to all connected sockets
        io.emit("newEvent", forestPkgId, pageId, event, socket.id);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in postNewEvent message handler`
        );
        console.log(err);
      }
    });
    socket.on("getNewAlias", (forestPkgId, prefix, callback) => {
      try {
        const eventManager = getEventManager(forestPkgId);
        const index = eventManager.incrementAlias(prefix);
        const alias = `${prefix}${index}`;
        callback(alias);
      } catch (err) {
        console.log(
          `[websocket-server] Following error occured in getNewAlias message handler`
        );
        console.log(err);
      }
    });
  });

  const port = (options && options.port) || 4001;
  server.listen(port, () => {
    const address = server.address();
    if (typeof address === "object" && address !== null) {
      let port = address.port;
      let ip = address.address;
      console.log(`[websocket_server] listening on http://${ip}:${port}`);
    } else if (typeof address === "string") {
      console.log(`[websocket_server] listening on http://${address}`);
    } else {
      console.log(`[websocket_server] cannot listen on ${port}`);
    }
  });
}