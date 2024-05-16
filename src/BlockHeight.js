/*
https://medium.com/@syedmahmad/relay-subscriptions-with-fragments-simplified-76489b6ebea0
https://relay.dev/docs/guided-tour/updating-data/graphql-subscriptions/
*/

import { graphql, useSubscription } from 'react-relay';
import { useMemo } from 'react';

const fragment = graphql`
  fragment BlockHeightFragment on subscription_root {
    appt_group_connection(
      where: {
        status: { _eq: "0" }
        ends_at: {_gt: $currentTime},
        starts_at: {_lt: $endTime}
      }
      order_by: { starts_at: asc }
    ) {
      edges {
        node {
          uuid
          starts_at
          ends_at
          minutes
          students
        }
      }
    }
  }
`;

const BlockHeightSubscription = graphql`
  subscription scheduleBlockHeightSubscription($currentTime: timestamptz, $endTime: timestamptz) {
    ...BlockHeightFragment
  }
`;

const BlockHeightContainer = () => {
  // subscription onNext callback udpates this reference.
  const [fragmentRef, setFragmentRef] = useState();
  // IMPORTANT: your config should be memoized.
  // Otherwise, useSubscription will re-render too frequently.
  // subsctiption configurations, that will be used later inside "useCallback" hook/
  const blockHeightConfig = useMemo(() => ({
    subscription: BlockHeightSubscription,
    variables: {
      currentTime: DateTime.now(),
      endTime: DateTime.now().plus({ days: 3 }),
    },
    // a callback that is executed when a subscription payload is received
    onNext: (res) => {
      // In res, we get the updated reference that, we can use in 
      // BlockHeightPage to read updated data from relay store.
      setFragmentRef(res); // here we will get the fragment Reference
    },
    // a callback that is executed when the subscription errors.
    onError: (err: any) => {},
    // a callback that is executed when the server ends the subscription
    onCompleted: () => {},
  }), []);

  // executing the subscription.
  useSubscription(blockHeightConfig);

  return (!!fragmentRef)
    ? (
        <BlockHeightPage fragmentRef={fragmentRef} />
      )
    : (
        <h2>loading...</h2>
      )
};

const BlockHeightPage = ({ fragmentRef }) => {
  // reading fragment data
  const storeData = useFragment(fragment, fragmentRef);
  const lessons = storeData?.appt_group_connection?.edges;
  return (
    lessons.map((item) => {
      return (
        <Fragment>
          <p>lesson minutes: {item.node.minutes}</p>
          <p>total students in lesson: {item.node.students}</p>
        </Fragment>
      );
    })
  )
};

