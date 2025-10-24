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
import { Mail, MessageCircle, BookOpen, Github, Users, Briefcase, Twitter, MessageSquare, CheckCircle, AlertCircle, Clock, FileText, Database, Phone, TrendingUp, Zap, BarChart3 } from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'
import parseLLMJson from '@/utils/jsonParser'

// Type Definitions
interface Integration {
  id: string
  name: string
  icon: React.ReactNode
  enabled: boolean
  status?: 'pending' | 'success' | 'failed' | 'skipped'
}

interface DistributionResult {
  status: 'success' | 'failed' | 'skipped'
  message?: string
}

interface SummaryResponse {
  summary: string
  summary_metadata: {
    character_count?: number
    word_count?: number
    tone_used?: string
    key_points: string[]
  }
  distribution_results: Record<string, DistributionResult>
  overall_status: 'success' | 'partial' | 'failed' | 'partial_success'
  success_count?: number
  failed_count?: number
  pending_count?: number
  retry_available?: string[]
  confidence?: number
  metadata?: {
    processing_time?: string
    integrations_used?: number
    summary_generation_method?: string
  }
}

interface SentimentAnalysisResponse {
  result: string
  sentiment_analysis: {
    overall_sentiment: string
    sentiment_score: number
    emotional_tone: string[]
    sentiment_trajectory: string[]
    key_emotions: {
      positive: number
      neutral: number
      negative: number
    }
  }
  engagement_metrics: {
    engagement_score: number
    response_balance: number
    topic_coherence: number
    interaction_quality: string
    participant_count: number
  }
  response_quality: {
    response_quality_score: number
    relevance: number
    completeness: number
    clarity: number
    helpfulness: number
  }
  overall_scoring: {
    conversation_quality_score: number
    satisfaction_likelihood: number
    recommendation_score: number
    rating: string
  }
  detailed_analysis: {
    strengths: string[]
    improvement_areas: string[]
    key_insights: string[]
  }
  confidence: number
  metadata: {
    processing_time: string
    messages_analyzed: number
    analysis_depth: string
  }
}

// Sub-component: Integration Panel
function IntegrationPanel({ integrations, onToggle }: { integrations: Integration[]; onToggle: (id: string) => void }) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Distribution Channels</CardTitle>
        <CardDescription>Select where to send the summary</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {integrations.map((integration) => (
          <div key={integration.id} className="flex items-center space-x-2">
            <Checkbox
              id={integration.id}
              checked={integration.enabled}
              onCheckedChange={() => onToggle(integration.id)}
            />
            <Label
              htmlFor={integration.id}
              className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm whitespace-nowrap"
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
  distributionResults?: Record<string, DistributionResult>
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
                  {metadata.character_count !== undefined && (
                    <div>
                      <span className="font-medium">Characters:</span> {metadata.character_count}
                    </div>
                  )}
                  {metadata.word_count !== undefined && (
                    <div>
                      <span className="font-medium">Words:</span> {metadata.word_count}
                    </div>
                  )}
                  {metadata.tone_used && (
                    <div>
                      <span className="font-medium">Tone:</span> {metadata.tone_used}
                    </div>
                  )}
                  {metadata.key_points && metadata.key_points.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">Key Points:</span>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {metadata.key_points.slice(0, 3).map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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
          <div className="space-y-4">
            <Alert className={overallStatus === 'success' || overallStatus === 'partial_success' ? 'bg-green-50' : 'bg-yellow-50'}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Distribution Complete</AlertTitle>
              <AlertDescription>
                {overallStatus === 'success' || overallStatus === 'partial_success'
                  ? 'Summary sent successfully!'
                  : 'Some channels failed to deliver.'}
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-48">
              <div className="space-y-3 pr-4">
                {Object.entries(distributionResults || {}).map(([channel, result]) => (
                  <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium capitalize text-sm">{channel}</span>
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

// Sub-component: Sentiment Analysis Modal
function SentimentAnalysisModal({
  isOpen,
  analysisData,
  onClose,
}: {
  isOpen: boolean
  analysisData: SentimentAnalysisResponse | null
  onClose: () => void
}) {
  if (!analysisData) return null

  const {
    sentiment_analysis,
    engagement_metrics,
    response_quality,
    overall_scoring,
    detailed_analysis,
    metadata,
  } = analysisData

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sentiment & Chat Scoring Analysis</DialogTitle>
          <DialogDescription>Comprehensive conversation analysis and quality metrics</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{(overall_scoring.conversation_quality_score * 100).toFixed(0)}%</div>
              <div className="text-xs text-slate-600 mt-1">Quality Score</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{(overall_scoring.satisfaction_likelihood * 100).toFixed(0)}%</div>
              <div className="text-xs text-slate-600 mt-1">Satisfaction</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{(overall_scoring.recommendation_score * 100).toFixed(0)}%</div>
              <div className="text-xs text-slate-600 mt-1">Recommend</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 capitalize">{overall_scoring.rating}</div>
              <div className="text-xs text-slate-600 mt-1">Overall Rating</div>
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Sentiment Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-600">Overall Sentiment</span>
                <div className="text-lg font-bold capitalize mt-1">{sentiment_analysis.overall_sentiment}</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Sentiment Score</span>
                <div className="text-lg font-bold mt-1">{(sentiment_analysis.sentiment_score * 100).toFixed(0)}%</div>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-slate-600">Key Emotions</span>
                <div className="flex gap-3 mt-2">
                  <div className="flex-1 bg-green-50 p-2 rounded text-center">
                    <div className="text-sm font-bold text-green-600">{(sentiment_analysis.key_emotions.positive * 100).toFixed(0)}%</div>
                    <div className="text-xs text-slate-600">Positive</div>
                  </div>
                  <div className="flex-1 bg-slate-50 p-2 rounded text-center">
                    <div className="text-sm font-bold text-slate-600">{(sentiment_analysis.key_emotions.neutral * 100).toFixed(0)}%</div>
                    <div className="text-xs text-slate-600">Neutral</div>
                  </div>
                  <div className="flex-1 bg-red-50 p-2 rounded text-center">
                    <div className="text-sm font-bold text-red-600">{(sentiment_analysis.key_emotions.negative * 100).toFixed(0)}%</div>
                    <div className="text-xs text-slate-600">Negative</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Engagement Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-sm text-slate-600">Engagement Score</span>
                <div className="text-lg font-bold mt-1">{(engagement_metrics.engagement_score * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Response Balance</span>
                <div className="text-lg font-bold mt-1">{(engagement_metrics.response_balance * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Topic Coherence</span>
                <div className="text-lg font-bold mt-1">{(engagement_metrics.topic_coherence * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Participants</span>
                <div className="text-lg font-bold mt-1">{engagement_metrics.participant_count}</div>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-slate-600">Interaction Quality</span>
                <div className="text-lg font-bold mt-1 capitalize">{engagement_metrics.interaction_quality}</div>
              </div>
            </div>
          </div>

          {/* Response Quality */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Response Quality</h3>
            <div className="space-y-3">
              {[
                { label: 'Overall Quality', value: response_quality.response_quality_score },
                { label: 'Relevance', value: response_quality.relevance },
                { label: 'Completeness', value: response_quality.completeness },
                { label: 'Clarity', value: response_quality.clarity },
                { label: 'Helpfulness', value: response_quality.helpfulness },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-24">{label}</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${(value ?? 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold min-w-12 text-right">{((value ?? 0) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Analysis */}
          {detailed_analysis && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Detailed Analysis</h3>
              <div className="space-y-3">
                {detailed_analysis.strengths && detailed_analysis.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {detailed_analysis.strengths.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailed_analysis.improvement_areas && detailed_analysis.improvement_areas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-orange-600 mb-2">Improvement Areas</h4>
                    <ul className="space-y-1">
                      {detailed_analysis.improvement_areas.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailed_analysis.key_insights && detailed_analysis.key_insights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-2">Key Insights</h4>
                    <ul className="space-y-1">
                      {detailed_analysis.key_insights.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="border-t pt-4 text-xs text-slate-600 space-y-1">
              <div>Processing Time: {metadata.processing_time}</div>
              <div>Messages Analyzed: {metadata.messages_analyzed}</div>
              <div className="capitalize">Analysis Depth: {metadata.analysis_depth}</div>
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main App Component
export default function App() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryMetadata, setSummaryMetadata] = useState<SummaryResponse['summary_metadata'] | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [distributionResults, setDistributionResults] = useState<Record<string, DistributionResult> | undefined>()
  const [overallStatus, setOverallStatus] = useState<string | undefined>()
  const [error, setError] = useState('')

  // Sentiment Analysis State
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysisResponse | null>(null)
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false)

  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'gmail', name: 'Gmail', icon: <Mail size={16} />, enabled: false },
    { id: 'slack', name: 'Slack', icon: <MessageCircle size={16} />, enabled: false },
    { id: 'notion', name: 'Notion', icon: <BookOpen size={16} />, enabled: false },
    { id: 'github', name: 'GitHub', icon: <Github size={16} />, enabled: false },
    { id: 'hubspot', name: 'HubSpot', icon: <Users size={16} />, enabled: false },
    { id: 'apollo', name: 'Apollo', icon: <Briefcase size={16} />, enabled: false },
    { id: 'twitter', name: 'Twitter', icon: <Twitter size={16} />, enabled: false },
    { id: 'discord', name: 'Discord', icon: <MessageSquare size={16} />, enabled: false },
    { id: 'salesforce', name: 'Salesforce', icon: <Database size={16} />, enabled: false },
    { id: 'google_drive', name: 'Google Drive', icon: <FileText size={16} />, enabled: false },
    { id: 'whatsapp', name: 'WhatsApp', icon: <Phone size={16} />, enabled: false },
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
      const message = `Summarize this conversation:\n\n${transcript}\n\nProvide JSON response with: summary, summary_metadata (character_count, word_count, tone_used, key_points array), distribution_results (empty object), overall_status, and retry_available array.`

      const response = await callAIAgent(message, '68fb49d771c6b27d6c8eb04a')

      if (!response?.response) {
        throw new Error('Invalid response from agent')
      }

      const parsedResponse = parseLLMJson(response.response, null) as SummaryResponse | null

      if (!parsedResponse?.summary) {
        throw new Error('Failed to generate summary')
      }

      setSummary(parsedResponse.summary)
      setSummaryMetadata(parsedResponse.summary_metadata)
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
      const channelList = selectedIntegrations.map((int) => int.name).join(', ')
      const message = `Distribute this summary to: ${channelList}\n\nSummary:\n${summary}\n\nFormat for each channel and respond with JSON containing: summary, summary_metadata, distribution_results (object with channel names as keys), overall_status, success_count, failed_count, pending_count, retry_available, confidence, and metadata.`

      const response = await callAIAgent(message, '68fb4abd4f148178b1db4a91')

      if (!response?.response) {
        throw new Error('Invalid response from agent')
      }

      const parsedResponse = parseLLMJson(response.response, null) as SummaryResponse | null

      if (!parsedResponse?.distribution_results) {
        const results: Record<string, DistributionResult> = {}
        selectedIntegrations.forEach((int) => {
          results[int.id] = { status: 'success', message: 'Delivered' }
        })
        setDistributionResults(results)
        setOverallStatus('success')
      } else {
        setDistributionResults(parsedResponse.distribution_results)
        setOverallStatus(parsedResponse.overall_status)
      }

      setIntegrations(
        integrations.map((int) => {
          const result = parsedResponse?.distribution_results?.[int.id]
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

  async function handleSentimentAnalysis(e: React.FormEvent) {
    e.preventDefault()
    if (!transcript.trim()) {
      setError('Please paste a chat transcript')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const message = `Perform comprehensive sentiment and engagement analysis on this conversation:\n\n${transcript}\n\nProvide JSON response with: result, sentiment_analysis (overall_sentiment, sentiment_score, emotional_tone array, sentiment_trajectory array, key_emotions object), engagement_metrics, response_quality, overall_scoring, detailed_analysis, confidence, and metadata.`

      const response = await callAIAgent(message, '68fb4bcd71c6b27d6c8eb060')

      if (!response?.response) {
        throw new Error('Invalid response from agent')
      }

      const parsedResponse = parseLLMJson(response.response, null) as SentimentAnalysisResponse | null

      if (!parsedResponse?.sentiment_analysis) {
        throw new Error('Failed to perform sentiment analysis')
      }

      setSentimentAnalysis(parsedResponse)
      setIsSentimentModalOpen(true)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to perform sentiment analysis'
      setError(errorMsg)
      console.error('Sentiment analysis error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedIntegrations = integrations.filter((int) => int.enabled)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Chat Intelligence Hub</h1>
              <p className="text-sm text-slate-500">Summarize, analyze, and distribute conversations</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
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
            <CardDescription>Paste your conversation to summarize, analyze, and distribute</CardDescription>
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

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={(e) => handleSentimentAnalysis(e as unknown as React.FormEvent)}
                  disabled={isLoading || !transcript.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analyze & Score
                    </>
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !transcript.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Summarize & Send
                    </>
                  )}
                </Button>
              </div>
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
        metadata={summaryMetadata}
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

      {/* Sentiment Analysis Modal */}
      <SentimentAnalysisModal
        isOpen={isSentimentModalOpen}
        analysisData={sentimentAnalysis}
        onClose={() => {
          setIsSentimentModalOpen(false)
          setSentimentAnalysis(null)
        }}
      />
    </div>
  )
}
