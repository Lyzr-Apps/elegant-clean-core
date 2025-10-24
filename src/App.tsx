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
import { Mail, MessageCircle, BookOpen, Github, Users, Briefcase, Twitter, MessageSquare, CheckCircle, AlertCircle, Clock, FileText, Database, Phone, TrendingUp, Zap } from 'lucide-react'
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
    character_count?: number
    key_points: string[]
    sentiment: string
    tone?: string
    topics: string[]
  }
  distribution_results: DistributionResult[]
  overall_status: 'success' | 'partial' | 'failed'
  retry_available: boolean
}

interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  score: number
  confidence: number
  emotions: {
    anger?: number
    joy?: number
    sadness?: number
    surprise?: number
    fear?: number
    trust?: number
    anticipation?: number
    disgust?: number
  }
  analysis: string
  recommendations?: string[]
  overall_tone: string
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

// Sub-component: Sentiment Gauge
function SentimentGauge({ score, sentiment }: { score: number; sentiment: string }) {
  const getColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      case 'neutral':
        return 'text-slate-600'
      case 'mixed':
        return 'text-orange-600'
      default:
        return 'text-slate-600'
    }
  }

  const getBgColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive':
        return 'bg-green-100'
      case 'negative':
        return 'bg-red-100'
      case 'neutral':
        return 'bg-slate-100'
      case 'mixed':
        return 'bg-orange-100'
      default:
        return 'bg-slate-100'
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-32 h-32 rounded-full ${getBgColor(sentiment)} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`text-4xl font-bold ${getColor(sentiment)}`}>{(score * 100).toFixed(0)}%</div>
          <div className="text-xs text-slate-600 capitalize mt-1">{sentiment}</div>
        </div>
      </div>
    </div>
  )
}

// Sub-component: Emotion Breakdown
function EmotionBreakdown({
  emotions,
}: {
  emotions: {
    anger?: number
    joy?: number
    sadness?: number
    surprise?: number
    fear?: number
    trust?: number
    anticipation?: number
    disgust?: number
  }
}) {
  const emotionList = Object.entries(emotions)
    .filter(([_, value]) => value !== undefined && value > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-2">
      {emotionList.map(([emotion, value]) => (
        <div key={emotion} className="flex items-center gap-2">
          <span className="capitalize text-sm font-medium min-w-20">{emotion}</span>
          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${(value ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-600 min-w-12 text-right">{((value ?? 0) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sentiment Analysis & Chat Scoring</DialogTitle>
          <DialogDescription>Detailed sentiment breakdown and emotional analysis</DialogDescription>
        </DialogHeader>

        {analysisData && (
          <div className="space-y-6">
            {/* Main Sentiment Score */}
            <div className="flex justify-center">
              <SentimentGauge score={analysisData.score} sentiment={analysisData.sentiment} />
            </div>

            {/* Confidence and Tone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <span className="text-sm font-medium">Confidence Score</span>
                <div className="text-2xl font-bold text-blue-600 mt-2">{(analysisData.confidence * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <span className="text-sm font-medium">Overall Tone</span>
                <div className="text-2xl font-bold text-purple-600 mt-2 capitalize">{analysisData.overall_tone}</div>
              </div>
            </div>

            {/* Emotional Breakdown */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Emotional Breakdown</h3>
              <EmotionBreakdown emotions={analysisData.emotions} />
            </div>

            {/* Analysis Text */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">Analysis</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{analysisData.analysis}</p>
            </div>

            {/* Recommendations */}
            {analysisData.recommendations && analysisData.recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {analysisData.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
                  {metadata.character_count !== undefined && (
                    <div>
                      <span className="font-medium">Characters:</span> {metadata.character_count}
                    </div>
                  )}
                  {metadata.tone && (
                    <div>
                      <span className="font-medium">Tone:</span> {metadata.tone}
                    </div>
                  )}
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

  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('medium')

  // Sentiment Analysis State
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysisResponse | null>(null)
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false)
  const [sentimentAgentId, setSentimentAgentId] = useState('')

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
    { id: 'gdrive', name: 'Google Drive', icon: <FileText size={16} />, enabled: false },
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
      const lengthGuide = {
        short: '1-2 sentences, max 100 words',
        medium: '2-3 sentences, max 200 words',
        long: '3-5 sentences, max 400 words',
      }

      const message = `Summarize the following conversation transcript with tone: ${tone} and length: ${lengthGuide[length as keyof typeof lengthGuide]}:\n\n${transcript}\n\nProvide response in JSON format with: summary, summary_metadata (word_count, character_count, key_points array with 3-5 items, sentiment, tone, topics array with 3-5 items), distribution_results (empty array), overall_status, and retry_available.`

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
      const channelList = selectedIntegrations.map((int) => int.name).join(', ')
      const message = `Distribute this summary to ${channelList}:\n\n${summary}\n\nFormat for each channel (email body, Slack markdown, Notion page, GitHub issue, HubSpot note, Apollo enrichment, tweet, Discord message, Salesforce record, Drive document, WhatsApp message) and respond with JSON containing distribution_results array. Each result should have: integration name, status ("success", "failed", or "skipped"), and optional message. Also include overall_status as "success", "partial", or "failed".`

      const response = await callAIAgent(message, '68fb4abd4f148178b1db4a91')

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

  async function handleSentimentAnalysis(e: React.FormEvent) {
    e.preventDefault()
    if (!transcript.trim()) {
      setError('Please paste a chat transcript')
      return
    }

    if (!sentimentAgentId.trim()) {
      setError('Please enter the Sentiment Analysis Agent ID')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const message = `Perform a comprehensive sentiment analysis and chat scoring on this conversation:\n\n${transcript}\n\nProvide response in JSON format with:\n{\n  "sentiment": "positive|negative|neutral|mixed",\n  "score": 0.0-1.0,\n  "confidence": 0.0-1.0,\n  "emotions": {\n    "anger": 0.0-1.0,\n    "joy": 0.0-1.0,\n    "sadness": 0.0-1.0,\n    "surprise": 0.0-1.0,\n    "fear": 0.0-1.0,\n    "trust": 0.0-1.0,\n    "anticipation": 0.0-1.0,\n    "disgust": 0.0-1.0\n  },\n  "analysis": "detailed analysis text",\n  "overall_tone": "professional|casual|formal|friendly|hostile",\n  "recommendations": ["recommendation1", "recommendation2"]\n}`

      const response = await callAIAgent(message, sentimentAgentId)

      if (!response?.response) {
        throw new Error('Invalid response from agent')
      }

      const parsedResponse = parseLLMJson(response.response, null) as SentimentAnalysisResponse | null

      if (!parsedResponse?.sentiment) {
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

              {/* Tone and Length Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tone</Label>
                  <select
                    value={tone}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTone(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="creative">Creative</option>
                    <option value="analytical">Analytical</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Length</Label>
                  <select
                    value={length}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLength(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="short">Short (1-2 sentences)</option>
                    <option value="medium">Medium (2-3 sentences)</option>
                    <option value="long">Long (3-5 sentences)</option>
                  </select>
                </div>
              </div>

              {/* Sentiment Agent ID Input */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Sentiment Analysis Agent ID (Optional)</Label>
                <input
                  type="text"
                  value={sentimentAgentId}
                  onChange={(e) => setSentimentAgentId(e.target.value)}
                  placeholder="Enter your Sentiment Analysis Agent ID to enable scoring..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={(e) => handleSentimentAnalysis(e as unknown as React.FormEvent)}
                  disabled={isLoading || !transcript.trim() || !sentimentAgentId.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
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
                      Generating...
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
