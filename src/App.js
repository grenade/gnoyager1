import { useState, useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';

const iso_dt = (offset = 0) => {
  return `${(new Date( +new Date() + offset )).toISOString().slice(0, -5)}Z`;
};

const App = () => {
  const [range, setRange] = useState({size: 100});
  const [blockchain, setBlockchain] = useState(undefined);
  const [transactions, setTransactions] = useState(undefined);
  useEffect(() => {
    setInterval(() => {
      fetch(`https://gnoyager1.v8r.io/graphql/query`, {
        method: 'POST',
        body: JSON.stringify({
          query: `query {
            blocks(
              filter: {
                from_time: "${iso_dt(-30000)}"
              }
            ) {
              height
              version
              chain_id
              time
              proposer_address_raw
            }
          }`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((response) => response.json())
      .then(({ data: { blocks } }) => {
        const b = blocks.slice(-1)[0];
        setBlockchain({
          id: b.chain_id,
          version: b.version,
          last: {
            block: {
              time: b.time,
              number: b.height,
              proposer: b.proposer_address_raw,
            }
          }
        })
      })
      .catch(console.error);
    }, 1000);
  }, []);
  useEffect(() => {
    if (!!blockchain && !!blockchain.last && !!blockchain.last.block && !!blockchain.last.block.number) {
      fetch(`https://gnoyager1.v8r.io/graphql/query`, {
        method: 'POST',
        body: JSON.stringify({
          query: `query {
            transactions(
              filter:{
                from_block_height: ${Math.max(1, (blockchain.last.block.number - (range.size - 1)))}
              }
            ) {
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
      .then(({data}) => {
        if (!!data && !!data.transactions) {
          setTransactions(data.transactions.map(({
            block_height: block,
            hash,
            messages: [
              {
                value,
                value: {
                  __typename: name,
                }
              }
            ]}) => ({
              block,
              hash,
              sender: (
                (name === 'BankMsgSend')
                  ? value.from_address
                  : (name === 'MsgAddPackage')
                    ? value.creator
                    : (['MsgCall', 'MsgRun'].includes(name))
                      ? value.caller
                      : undefined
              ),
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
            })).reverse()
          );
        }
        /*
        */
      })
      .catch(console.error);
    }
  }, [blockchain, range]);

  return (
    <Container>
      <h3>runtime statistics</h3>
      {
        (!!blockchain)
          ? (
              <Alert variant="warning">
                statistics shown relate to extrinsics executed between block {Math.max(1, (blockchain.last.block.number - (range.size - 1)))} and {blockchain.last.block.number} inclusive.
              </Alert>
            )
          : (
              <Spinner animation="border" size="sm" />
            )
      }
      <ul>
        <li>
          number of transactions: {
            (!!transactions)
              ? (transactions.length)
              : (
                  <Spinner animation="border" size="sm" />
                )
          }
        </li>
        <li>
          number of different message types: {
            (!!transactions)
              ? (
                  <ul>
                    {
                      [...new Set(transactions.map((tx) => tx.extrinsic.name))].map((extrinsic) => (
                        <li key={extrinsic}>
                          {extrinsic}: {transactions.filter((tx) => (tx.extrinsic.name === extrinsic)).length}
                        </li>
                      ))
                    }
                  </ul>
                )
              : (
                  <Spinner animation="border" size="sm" />
                )
          }
        </li>
        <li>
          most active accounts: {
            (!!transactions)
              ? (
                  <ul>
                    {
                      [...new Set(transactions.map((tx) => tx.extrinsic.name))].map((extrinsic) => (
                        <li key={extrinsic}>
                          {extrinsic}:
                          <ul>
                            {
                              [...new Set(transactions.filter((tx) => (tx.extrinsic.name === extrinsic)).map(({sender}) => sender))].map((sender) => (
                                <li key={sender}>
                                  <pre style={{display: 'inline'}}>{sender}</pre>: {
                                    transactions.filter((tx) => (tx.extrinsic.name === extrinsic && tx.sender === sender)).length
                                  }
                                </li>
                              ))
                            }
                          </ul>
                        </li>
                      ))
                    }
                  </ul>
                )
              : (
                  <Spinner animation="border" size="sm" />
                )
          }
        </li>
        {
          /*
        <li>most active realms / packages deployed / called</li>
          */
        }
      </ul>
      <h3>raw extrinsics data</h3>
      {
        (!!transactions)
          ? (
              <pre>
                {JSON.stringify(transactions, null, 2)}
              </pre>
            )
          : null
      }
      {
        (!!blockchain)
          ? (
              <pre>
                {JSON.stringify(blockchain, null, 2)}
              </pre>
            )
          : null
      }
    </Container>
  );
}

export default App;
