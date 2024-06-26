import { useState, useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
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
      <Row>
        {
          (!!blockchain)
            ? (
                <Alert variant="warning" style={{margin: '1em'}}>
                  statistics shown relate to extrinsic executions occuring between block {Math.max(1, (blockchain.last.block.number - (range.size - 1)))} and {blockchain.last.block.number} inclusive.
                </Alert>
              )
            : (
                <Spinner animation="border" size="sm" />
              )
        }
      </Row>
      <Row>
        <Col style={{padding: '1em'}}>
          <h3>
            runtime statistics (block {
                (!!transactions)
                  ? (transactions.slice(-1)[0].block)
                  : (<Spinner animation="border" size="sm" />)
              } to {
                (!!transactions)
                  ? (transactions[0].block)
                  : (<Spinner animation="border" size="sm" />)
              })
          </h3>
          <ul>
            <li>
              number of extrinsic executions: {
                (!!transactions)
                  ? (transactions.length)
                  : (
                      <Spinner animation="border" size="sm" />
                    )
              }
            </li>
            <li>
              number of extrinsic types: {
                (!!transactions)
                  ? ([...new Set(transactions.map(({extrinsic}) => extrinsic.name))].length)
                  : (
                      <Spinner animation="border" size="sm" />
                    )
              }{
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
              active accounts: {
                (!!transactions)
                  ? ([...new Set(transactions.map(({sender}) => sender))].length)
                  : (
                      <Spinner animation="border" size="sm" />
                    )
              }{
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
        </Col>
        <Col style={{padding: '1em'}}>
          <h3>extrinsics</h3>
          <ul>
            {
              (!!transactions)
                ? [...Array(range.size).keys()].map(i => i + Math.max(1, (blockchain.last.block.number - (range.size - 1)))).filter((x) => ((x > 0) && (x <= blockchain.last.block.number))).reverse().map((b) => (
                    <li key={b}>
                      block {b}
                      {
                        (transactions.some((t) => t.block === b))
                          ? (
                              <ul>
                                {
                                  transactions.filter((t) => t.block === b).map((tx) => (
                                    <li>
                                      {tx.extrinsic.name}<br />
                                      {
                                        (tx.extrinsic.name === 'MsgAddPackage')
                                          ? (
                                              <ul>
                                                <li>
                                                  hash: <pre style={{display: 'inline'}}>{tx.hash}</pre>
                                                </li>
                                                <li>
                                                  creator: {tx.extrinsic.value.creator}
                                                </li>
                                                <li>
                                                  name: {tx.extrinsic.value.package.name}
                                                </li>
                                                <li>
                                                  path: {tx.extrinsic.value.package.path}
                                                </li>
                                              </ul>
                                            )
                                          : (tx.extrinsic.name === 'BankMsgSend')
                                            ? (
                                                <ul>
                                                  <li>
                                                    hash: <pre style={{display: 'inline'}}>{tx.hash}</pre>
                                                  </li>
                                                  <li>
                                                    from: <pre style={{display: 'inline'}}>{tx.extrinsic.value.from}</pre>
                                                  </li>
                                                  <li>
                                                    to: <pre style={{display: 'inline'}}>{tx.extrinsic.value.to}</pre>
                                                  </li>
                                                  <li>
                                                    amount: {tx.extrinsic.value.amount}
                                                  </li>
                                                </ul>
                                              )
                                            : (['MsgCall', 'MsgRun'].includes(tx.extrinsic.name))
                                              ? (
                                                  <ul>
                                                    <li>
                                                      hash: <pre style={{display: 'inline'}}>{tx.hash}</pre>
                                                    </li>
                                                    <li>
                                                      caller: {tx.extrinsic.value.caller}
                                                    </li>
                                                    <li>
                                                      path: {tx.extrinsic.value.package.path}
                                                    </li>
                                                  </ul>
                                                )
                                              : null
                                      }
                                    </li>
                                  ))
                                }
                              </ul>
                            )
                          : null
                      }
                    </li>
                  ))
                : null
            }
          </ul>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
