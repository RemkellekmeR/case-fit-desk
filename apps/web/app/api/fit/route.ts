import {FitLookupError, runLocalFit, type FitRequest} from '@/lib/compute-fit'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const input: FitRequest = {
    moduleSlug: url.searchParams.get('moduleSlug') || undefined,
    caseSlug: url.searchParams.get('caseSlug') || undefined,
    moduleQuery: url.searchParams.get('module') || undefined,
    caseQuery: url.searchParams.get('case') || undefined,
    query: url.searchParams.get('q') || undefined,
  }
  return respond(input)
}

export async function POST(req: Request) {
  let body: FitRequest = {}
  try {
    body = (await req.json()) as FitRequest
  } catch {
    body = {}
  }
  return respond(body)
}

function respond(input: FitRequest) {
  try {
    const result = runLocalFit(input)
    return Response.json(result)
  } catch (err) {
    if (err instanceof FitLookupError) {
      return Response.json({error: err.message, mode: 'local-seed'}, {status: err.status})
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({error: message, mode: 'local-seed'}, {status: 500})
  }
}
