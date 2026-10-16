import DashboardOverview from './components/DashboardOverview';

type DashboardPageProps = React.ComponentProps<typeof DashboardOverview>;

/** Feature page entry point for the platform dashboard. */
export default function DashboardPage(props: DashboardPageProps) {
  return <DashboardOverview {...props} />;
}
