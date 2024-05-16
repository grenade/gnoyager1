import {
  Environment,
  Network,
  RecordSource,
  Store,
  Observable,
} from "relay-runtime";
import { createClient } from "graphql-ws";

const HTTP_ENDPOINT = "http://localhost:5000/graphql";
const WEBSOCKET_ENDPOINT = "ws://localhost:5000/graphql";

const fetchFn = async (request, variables) => {
  const resp = await fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      Accept:
        "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
      "Content-Type": "application/json",
      // <-- Additional headers like 'Authorization' would go here
    },
    body: JSON.stringify({
      query: request.text, // <-- The GraphQL document composed by Relay
      variables,
    }),
  });

  return await resp.json();
};

let subscribeFn;

if (typeof window !== "undefined") {
  // We only want to setup subscriptions if we are on the client.
  const subscriptionsClient = createClient({
    url: WEBSOCKET_ENDPOINT,
  });

  subscribeFn = (request, variables) => {
    return Observable.create((sink) => {
      if (!request.text) {
        return sink.error(new Error("Operation text cannot be empty"));
      }

      return subscriptionsClient.subscribe(
        {
          operationName: request.name,
          query: request.text,
          variables,
        },
        sink
      );
    });
  };
}

function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchFn, subscribeFn),
    store: new Store(new RecordSource()),
  });
}

export const RelayEnvironment = createRelayEnvironment();
