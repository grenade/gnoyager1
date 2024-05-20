import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import { Message } from "protobufjs/light";
//import { /*encodeString,*/ decodeString } from '@tendermint/amino-js';
//import { Observable } from 'relay-runtime';
//import { Observable } from 'rxjs';
//import { createClient } from 'graphql-ws';
//import graphql from "babel-plugin-relay/macro";
/*
const client = createClient({
  url: 'wss://gnoyager1.v8r.io/ws',
});

const toObservable = (operation) => (
  new Observable((observer) =>
    client.subscribe(operation, {
      next: (data) => observer.next(data),
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    }),
  )
);
*/

const App = () => {
  const [data, setData] = useState(undefined);
  const [filter, setFilter] = useState(undefined);
  /*
  useEffect(() => {
    setInterval(() => {
      fetch(`https://gnoyager1.v8r.io/graphql/query`, {
        method: 'POST',
        body: JSON.stringify({
          query: `query {
            transactions(filter:{}) {
              block_height
              hash
              messages {
                route,
                typeUrl
                value {
                  __typename,
                  ... on BankMsgSend {
                    from_address
                    to_address
                    amount
                  }
                  ... on MsgAddPackage {
                    creator
                    package {
                      name
                      path
                    }
                  }
                  ... on MsgCall {
                    caller
                    pkg_path
                    args
                  }
                  ... on MsgRun {
                    caller
                    package {
                      path
                    }
                  }
                }
              }
            }
          }`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((response) => response.json())
      .then(({ data: { transactions } }) => {
        const height = transactions.slice(-1)[0].block_height;
        setData((data) => ({
          ...data,
          height,
          transactions: transactions.map(({
            block_height: block,
            hash,
            messages: [
              {
                value,
                value: {
                  __typename: name,
                }
              }
            ],
          }) => ({
            block,
            hash,
            extrinsic: {
              name,
              value: {
                ...(name === 'BankMsgSend') && {
                  from: value.from_address,
                  to: value.to_address,
                  amount: value.amount,
                },
                ...(name === 'MsgAddPackage') && {
                  creator: value.creator,
                  package: value.package,
                },
                ...(name === 'MsgCall') && {
                  caller: value.caller,
                  package: {
                    path: value.pkg_path,
                  },
                  args: value.args,
                },
                ...(name === 'MsgRun') && {
                  caller: value.caller,
                  package: {
                    path: value.package.path,
                  },
                },
              },
            },
          })).reverse(),
        }));
      })
      .catch(console.error);
    }, 3000);
  }, []);
  */
  useEffect(() => {
    if (!filter) {
      fetch(`https://gnoyager1.v8r.io`, {
        method: 'POST',
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'newBlockFilter',
          params: []
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((response) => response.json())
      .then(({ result }) => setFilter(result))
      .catch(console.error);
    };
  }, []);
  useEffect(() => {
    setInterval(() => {
      if (!!filter) {
        fetch(`https://gnoyager1.v8r.io`, {
          method: 'POST',
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'getFilterChanges',
            params: [
              filter
            ]
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then((response) => response.json())
        .then(({ result }) => {
          if (!!result && !!result.length) {
            setData(atob(result[0]).split('\n'));
          }
        })
        .catch(console.error);
      };
    }, 3000);
  }, [ filter ]);

  return (
    <Container fluid>
      {
        (!!data)
          ? (
              <pre>
                {JSON.stringify(data, null, 2)}
              </pre>
            )
          : null
      }
    </Container>
  );
}

export default App;
