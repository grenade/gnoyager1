import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';

const App = () => {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    //setInterval(() => {
      fetch(`https://gnoyager1.v8r.io/graphql/query`, {
        method: 'POST',
        body: JSON.stringify({
          query: 'query{transactions(filter:{}){block_height,hash,messages{route,typeUrl}}}'
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
            messages: [ { route, typeUrl: method } ],
          }) => ({
            block,
            hash,
            route,
            method,
          })).reverse(),
        }));
      })
      .catch(console.error);
    //}, 3000);
  }, []);
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
