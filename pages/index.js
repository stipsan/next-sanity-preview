import Head from 'next/head'
import { lazy, Suspense, useState } from 'react'
import Container from '../components/container'
import HeroPost from '../components/hero-post'
import Intro from '../components/intro'
import Layout from '../components/layout'
import MoreStories from '../components/more-stories'
import { sanityConfig } from '../lib/config'
import { CMS_NAME } from '../lib/constants'
import { indexQuery } from '../lib/queries'
import { getClient, overlayDrafts } from '../lib/sanity.server'

const PreviewMode = lazy(() => import('next-sanity/preview'))

export default function Index({ allPosts: initialAllPosts, preview, token }) {
  const [allPosts, setPosts] = useState(initialAllPosts)
  const [heroPost, ...morePosts] = allPosts || []
  return (
    <>
      {preview && (
        <Suspense fallback={null}>
          <PreviewMode
            projectId={sanityConfig.projectId}
            dataset={sanityConfig.dataset}
            initial={initialAllPosts}
            query={indexQuery}
            onChange={setPosts}
            token={token}
          />
        </Suspense>
      )}
      <Layout preview={preview}>
        <Head>
          <title>Next.js Blog Example with {CMS_NAME}</title>
        </Head>
        <Container>
          <Intro />
          {heroPost && (
            <HeroPost
              title={heroPost.title}
              coverImage={heroPost.coverImage}
              date={heroPost.date}
              author={heroPost.author}
              slug={heroPost.slug}
              excerpt={heroPost.excerpt}
            />
          )}
          {morePosts.length > 0 && <MoreStories posts={morePosts} />}
        </Container>
      </Layout>
    </>
  )
}

export async function getStaticProps({ preview = false, previewData = {} }) {
  const client =
    preview && previewData?.token
      ? getClient(false).withConfig({ token: previewData.token })
      : getClient(preview)
  const allPosts = overlayDrafts(await client.fetch(indexQuery))
  return {
    props: { allPosts, preview, token: (preview && previewData.token) || '' },
    // If webhooks isn't setup then attempt to re-generate in 1 minute intervals
    revalidate: process.env.SANITY_REVALIDATE_SECRET ? undefined : 60,
  }
}
