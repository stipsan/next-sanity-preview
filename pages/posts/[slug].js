import dynamic from 'next/dynamic'
import ErrorPage from 'next/error'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import Container from '../../components/container'
import Header from '../../components/header'
import Layout from '../../components/layout'
import MoreStories from '../../components/more-stories'
import PostBody from '../../components/post-body'
import PostHeader from '../../components/post-header'
import PostTitle from '../../components/post-title'
import SectionSeparator from '../../components/section-separator'
import { CMS_NAME } from '../../lib/constants'
import { postQuery, postSlugsQuery } from '../../lib/queries'
import { urlForImage } from '../../lib/sanity'
import { getClient, overlayDrafts, sanityClient } from '../../lib/sanity.server'
import { sanityConfig } from '../../lib/config'

const PreviewMode = dynamic(() => import('next-sanity/preview'))

export default function Post({ data: initialData = {}, preview, token }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)

  const slug = data?.post?.slug
  const { post, morePosts } = data

  if (!router.isFallback && !slug) {
    return <ErrorPage statusCode={404} />
  }

  return (
    <>
      {preview && slug && (
        <PreviewMode
          projectId={sanityConfig.projectId}
          dataset={sanityConfig.dataset}
          initial={initialData}
          query={postQuery}
          onChange={setData}
          token={token}
          params={{ slug }}
        />
      )}
      <Layout preview={preview}>
        <Container>
          <Header />
          {router.isFallback ? (
            <PostTitle>Loading…</PostTitle>
          ) : (
            <>
              <article>
                <Head>
                  <title>
                    {post.title} | Next.js Blog Example with {CMS_NAME}
                  </title>
                  {post.coverImage?.asset?._ref && (
                    <meta
                      key="ogImage"
                      property="og:image"
                      content={urlForImage(post.coverImage)
                        .width(1200)
                        .height(627)
                        .fit('crop')
                        .url()}
                    />
                  )}
                </Head>
                <PostHeader
                  title={post.title}
                  coverImage={post.coverImage}
                  date={post.date}
                  author={post.author}
                />
                <PostBody content={post.content} />
              </article>
              <SectionSeparator />
              {morePosts.length > 0 && <MoreStories posts={morePosts} />}
            </>
          )}
        </Container>
      </Layout>
    </>
  )
}

export async function getStaticProps({
  params,
  preview = false,
  previewData = {},
}) {
  const client =
    preview && previewData?.token
      ? getClient(false).withConfig({ token: previewData.token })
      : getClient(preview)
  const { post, morePosts } = await client.fetch(postQuery, {
    slug: params.slug,
  })

  return {
    props: {
      preview,
      token: (preview && previewData.token) || '',
      data: {
        post,
        morePosts: overlayDrafts(morePosts),
      },
    },
    // If webhooks isn't setup then attempt to re-generate in 1 minute intervals
    revalidate: process.env.SANITY_REVALIDATE_SECRET ? undefined : 60,
  }
}

export async function getStaticPaths() {
  const paths = await sanityClient.fetch(postSlugsQuery)
  return {
    paths: paths.map((slug) => ({ params: { slug } })),
    fallback: true,
  }
}
