import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/intro">
            Read the Developer Docs →
          </Link>
          <Link
            className="button button--secondary button--outline button--lg"
            href="https://orgchart.opensource.mieweb.org/"
            style={{ marginLeft: '1rem' }}>
            Try it Live 🚀
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageScreenshot() {
  const screenshotUrl = useBaseUrl('/img/ychart-screenshot.png');
  return (
    <section className={styles.screenshotSection}>
      <div className="container">
        <a
          href="https://orgchart.opensource.mieweb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.screenshotLink}
          aria-label="Try YChart Editor live demo"
        >
          <img
            src={screenshotUrl}
            alt="YChart Editor showing an interactive organizational chart with employee hierarchy"
            className={styles.screenshot}
          />
          <span className={styles.screenshotOverlay}>
            <span className={styles.playButton}>▶ Try it Live</span>
          </span>
        </a>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Interactive Organizational Charts`}
      description="YChart is a powerful, interactive organizational chart editor built with TypeScript, D3.js, and d3-org-chart. Create beautiful org charts with YAML data.">
      <HomepageHeader />
      <main>
        <HomepageScreenshot />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
