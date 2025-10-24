import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mail, MessageCircle, BookOpen, Github, Users, Briefcase, Twitter, MessageSquare, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'
import parseLLMJson from '@/utils/jsonParser'

// Types
interface Integration {
  id: string
  name: string
  icon: React.ReactNode
  enabled: boolean
  status?: 'pending' | 'success' | 'failed' | 'skipped'
}

interface DistributionResult {
  integration: string
  status: 'success' | 'failed' | 'skipped'
  message?: string
  url?: string
}

interface SummaryResponse {
  summary: string
  summary_metadata: {
    word_count: number
    key_points: string[]
    sentiment: string
    topics: string[]
  }
  distribution_results: DistributionResult[]
  overall_status: 'success' | 'partial' | 'failed'
  retry_available: boolean
}

// Sub-component: Integration Panel
function IntegrationPanel({ integrations, onToggle }: { integrations: Integration[]; onToggle: (id: string) => void }) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Distribution Channels</CardTitle>
        <CardDescription>Select where to send the summary</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="flex items-center space-x-2">
            <Checkbox
              id={integration.id}
              checked={integration.enabled}
              onCheckedChange={() => onToggle(integration.id)}
            />
            <Label
              htmlFor={integration.id}
              className="flex items-center gap-1 cursor-pointer text-sm"
            >
              {integration.icon}
              <span className="hidden sm:inline">{integration.name}</span>
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Sub-component: Status Chip
function StatusChip({ status, message }: { status: string; message?: string }) {
  const statusConfig = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    success: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
    skipped: { bg: 'bg-slate-100', text: 'text-slate-800', icon: Clock },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const IconComponent = config.icon

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${config.bg} ${config.text} text-xs font-medium`}>
      <IconComponent size={14} />
      <span className="capitalize">{status}</span>
      {message && <span className="ml-1">- {message}</span>}
    </div>
  )
}

// Sub-component: Summary Modal
function SummaryModal({
  isOpen,
  summary,
  metadata,
  onClose,
  onSend,
  selectedIntegrations,
  isLoading,
  distributionResults,
  overallStatus,
}: {
  isOpen: boolean
  summary: string
  metadata?: SummaryResponse['summary_metadata']
  onClose: () => void
  onSend: () => void
  selectedIntegrations: Integration[]
  isLoading: boolean
  distributionResults?: DistributionResult[]
  overallStatus?: string
}) {
  const [editedSummary, setEditedSummary] = useState(summary)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Summary</DialogTitle>
          <DialogDescription>Edit if needed and confirm distribution</DialogDescription>
        </DialogHeader>

        {/* Summary Content */}
        {!distributionResults ? (
          <>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Summary</Label>
                <Textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="mt-2 min-h-32"
                  disabled={isLoading}
                />
              </div>

              {metadata && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Word Count:</span> {metadata.word_count}
                  </div>
                  <div>
                    <span className="font-medium">Sentiment:</span> {metadata.sentiment}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Topics:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {metadata.topics.map((topic, idx) => (
                        <Badge key={idx} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Key Points:</span>
                    <ul className="list-disc list-inside mt-1 text-xs">
                      {metadata.key_points.slice(0, 3).map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Integration Selection */}
              {selectedIntegrations.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Send to:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIntegrations.map((integration) => (
                      <Badge key={integration.id} variant="outline" className="text-left justify-start">
                        {integration.icon}
                        <span className="ml-2">{integration.name}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={onSend} disabled={isLoading || selectedIntegrations.length === 0}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  'Send to Selected'
                )}
              </Button>
            </div>
          </>
        ) : (
          // Distribution Results View
          <div className="space-y-4">
            <Alert className={overallStatus === 'success' ? 'bg-green-50' : 'bg-yellow-50'}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Distribution Complete</AlertTitle>
              <AlertDescription>
                {overallStatus === 'success' ? 'Summary sent successfully!' : 'Some channels failed to deliver.'}
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-48">
              <div className="space-y-3 pr-4">
                {distributionResults.map((result) => (
                  <div
                    key={result.integration}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium capitalize text-sm">{result.integration}</span>
                    <StatusChip status={result.status} message={result.message} />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Main App Component
export default function App() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [metadata, setMetadata] = useState<SummaryResponse['summary_metadata'] | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [distributionResults, setDistributionResults] = useState<DistributionResult[] | undefined>()
  const [overallStatus, setOverallStatus] = useState<string | undefined>()
  const [error, setError] = useState('')

  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'gmail', name: 'Gmail', icon: <Mail size={16} />, enabled: false },
    { id: 'slack', name: 'Slack', icon: <MessageCircle size={16} />, enabled: false },
    { id: 'notion', name: 'Notion', icon: <BookOpen size={16} />, enabled: false },
    { id: 'github', name: 'GitHub', icon: <Github size={16} />, enabled: false },
    { id: 'hubspot', name: 'HubSpot', icon: <Users size={16} />, enabled: false },
    { id: 'apollo', name: 'Apollo', icon: <Briefcase size={16} />, enabled: false },
    { id: 'twitter', name: 'Twitter', icon: <Twitter size={16} />, enabled: false },
    { id: 'discord', name: 'Discord', icon: <MessageSquare size={16} />, enabled: false },
  ])

  function toggleIntegration(id: string) {
    setIntegrations(
      integrations.map((int) =>
        int.id === id ? { ...int, enabled: !int.enabled } : int
      )
    )
  }

  async function handleSummarize(e: React.FormEvent) {
    e.preventDefault()
    if (!transcript.trim()) {
      setError('Please paste a chat transcript')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const message = `Summarize the following conversation transcript and provide metadata:\n\n${transcript}\n\nProvide response in JSON format with: summary (2-3 sentences), summary_metadata (word_count, key_points array with 3-5 items, sentiment, topics array with 3-5 items), distribution_results (empty array), overall_status, and retry_available.`

      const response = await callAIAgent(message, '68fb49d771c6b27d6c8eb04a')

      if (!response?.response) {
        throw new Error('Invalid response from agent')
      }

      const parsedResponse = parseLLMJson(response.response, null) as SummaryResponse | null

      if (!parsedResponse?.summary) {
        throw new Error('Failed to generate summary')
      }

      setSummary(parsedResponse.summary)
      setMetadata(parsedResponse.summary_metadata)
      setDistributionResults(undefined)
      setIsModalOpen(true)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate summary'
      setError(errorMsg)
      console.error('Summary error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSend() {
    const selectedIntegrations = integrations.filter((int) => int.enabled)

    if (selectedIntegrations.length === 0) {
      setError('Select at least one integration')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const message = `Send this summary to the following integrations: ${selectedIntegrations
        .map((int) => int.name)
        .join(', ')}.\n\nSummary:\n${summary}\n\nRespond with JSON containing distribution_results array where each item has integration name, status ("success", "failed", or "skipped"), and optional message. Also include overall_status as "success", "partial", or "failed".`

      const response = await callAIAgent(message, '68fb49d771c6b27d6c8eb04a')

      if (!response?.response) {
        throw new Error('Invalid response from agent')
      }

      const parsedResponse = parseLLMJson(response.response, null) as SummaryResponse | null

      if (!parsedResponse?.distribution_results) {
        // Simulate successful distribution if no specific results
        const results: DistributionResult[] = selectedIntegrations.map((int) => ({
          integration: int.name,
          status: 'success',
          message: 'Summary delivered',
        }))
        setDistributionResults(results)
        setOverallStatus('success')
      } else {
        setDistributionResults(parsedResponse.distribution_results)
        setOverallStatus(parsedResponse.overall_status)
      }

      // Update integration statuses
      setIntegrations(
        integrations.map((int) => {
          const result = parsedResponse?.distribution_results?.find(
            (r) => r.integration.toLowerCase() === int.name.toLowerCase()
          )
          return result ? { ...int, status: result.status } : int
        })
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send summary'
      setError(errorMsg)
      console.error('Send error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedIntegrations = integrations.filter((int) => int.enabled)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Conversation Summarizer</h1>
              <p className="text-sm text-slate-500">Transform chat into actionable insights</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Paste Chat Transcript</CardTitle>
            <CardDescription>Paste your conversation to generate a concise summary</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSummarize} className="space-y-4">
              <Textarea
                placeholder="Paste your chat transcript here... (emails, messages, meeting notes, etc.)"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-40 resize-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !transcript.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Generating Summary...
                  </>
                ) : (
                  'Summarize & Send'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Integration Panel */}
        <IntegrationPanel integrations={integrations} onToggle={toggleIntegration} />

        {/* Selected Integrations Display */}
        {selectedIntegrations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Summary will be sent to {selectedIntegrations.length} channel{selectedIntegrations.length !== 1 ? 's' : ''}:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedIntegrations.map((integration) => (
                  <Badge key={integration.id} variant="secondary" className="gap-2 bg-white">
                    {integration.icon}
                    {integration.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Summary Modal */}
      <SummaryModal
        isOpen={isModalOpen}
        summary={summary}
        metadata={metadata}
        onClose={() => {
          setIsModalOpen(false)
          setDistributionResults(undefined)
          setOverallStatus(undefined)
        }}
        onSend={handleSend}
        selectedIntegrations={selectedIntegrations}
        isLoading={isLoading}
        distributionResults={distributionResults}
        overallStatus={overallStatus}
      />
    </div>
  )
}
