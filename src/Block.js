import { Observable } from 'relay-runtime';

const client = createClient({
  url: 'wss://gnoyager1.v8r.io/graphql/query',
});

const toObservable = (operation) => (
  new Observable((observer) =>
    client.subscribe(operation, {
      next: (data) => observer.next(data),
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    }),
  );
);

const observable = toObservable({
  query: `
    subscription {
      blocks(filter: {}) {
        height
        version
        chain_id
        time
        proposer_address_raw
      }
    }
`
});
const subscription = observable.subscribe({
  next: (data) => {
    //expect(data).toBe({ data: { ping: 'pong' } });
  },
});

// ⏱

subscription.unsubscribe();
