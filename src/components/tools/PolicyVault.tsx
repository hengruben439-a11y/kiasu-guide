'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  file_url: string
  document_type: string | null
  extraction_status: string
  confidence_score: number | null
  created_at: string
}

interface Props {
  userId: string
  initialDocuments: Document[]
}

const DOC_TYPES = [
  { value: 'policy_schedule', label: 'Policy Schedule' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'tax_notice', label: 'Tax Notice / NOA' },
  { value: 'other', label: 'Other' },
]

const STATUS_META: Record<string, { label: string; colour: string; bg: string }> = {
  pending:    { label: 'Pending review',  colour: '#a89070', bg: 'rgba(196,168,130,0.1)' },
  processing: { label: 'Processing…',    colour: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  done:       { label: 'Reviewed',        colour: '#16a34a', bg: 'rgba(22,163,74,0.08)'  },
  failed:     { label: 'Failed',          colour: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
}

function fileName(url: string): string {
  const parts = url.split('/')
  const raw = parts[parts.length - 1] ?? 'document'
  // strip timestamp prefix: 1742345678901_filename.pdf → filename.pdf
  return raw.replace(/^\d+_/, '')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function PolicyVault({ userId, initialDocuments }: Props) {
  const [docs, setDocs] = useState<Document[]>(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState('policy_schedule')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: false })

    if (storageError) {
      setUploadError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(path)

    // Store a signed URL reference instead (bucket is private)
    const { data: signed } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year expiry

    const fileUrl = signed?.signedUrl ?? publicUrl

    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        file_url: fileUrl,
        document_type: selectedType,
        extraction_status: 'pending',
      })
      .select()
      .single()

    if (dbError || !doc) {
      setUploadError('File uploaded but record failed to save.')
    } else {
      setDocs((prev) => [doc as Document, ...prev])
    }

    setUploading(false)
  }, [userId, selectedType])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  async function deleteDoc(docId: string) {
    const supabase = createClient()
    await supabase.from('documents').delete().eq('id', docId)
    setDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  const typeLabel = (type: string | null) =>
    DOC_TYPES.find((t) => t.value === type)?.label ?? 'Document'

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(42,31,26,0.07)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(42,31,26,0.06)',
        background: '#fdf8f2',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Policy Vault
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>
            Your Documents
          </p>
        </div>
        <span style={{ fontSize: 13, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          {docs.length} file{docs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Upload type selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${selectedType === t.value ? '#7a1c2e' : 'rgba(42,31,26,0.12)'}`,
                background: selectedType === t.value ? 'rgba(122,28,46,0.07)' : 'transparent',
                color: selectedType === t.value ? '#7a1c2e' : '#a89070',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          animate={{ borderColor: dragOver ? '#7a1c2e' : 'rgba(42,31,26,0.12)', scale: dragOver ? 1.01 : 1 }}
          transition={{ duration: 0.15 }}
          style={{
            border: '2px dashed rgba(42,31,26,0.12)',
            borderRadius: 12,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(122,28,46,0.03)' : 'transparent',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#7a1c2e' }}
                />
              ))}
              <span style={{ fontSize: 13, color: '#a89070', marginLeft: 8, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Uploading…
              </span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 22, margin: '0 0 8px' }}>📎</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1f1a', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Drop a file here, or click to browse
              </p>
              <p style={{ fontSize: 11, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                PDF, JPG, PNG — max 10 MB · Uploading as: <strong>{typeLabel(selectedType)}</strong>
              </p>
            </>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {uploadError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 12, color: '#dc2626', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              {uploadError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Document list */}
        {docs.length === 0 ? (
          <p style={{ fontSize: 13, color: '#a89070', textAlign: 'center', padding: '16px 0', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            No documents uploaded yet. Upload your first policy schedule above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence initial={false}>
              {docs.map((doc) => {
                const meta = STATUS_META[doc.extraction_status] ?? STATUS_META.pending
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#fdf8f2',
                      border: '1px solid rgba(42,31,26,0.07)',
                      borderRadius: 10,
                      gap: 12,
                    }}
                  >
                    {/* File icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>
                        {doc.document_type === 'policy_schedule' ? '📄'
                          : doc.document_type === 'payslip' ? '💳'
                          : doc.document_type === 'tax_notice' ? '🏛️'
                          : '📎'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 600, color: '#2a1f1a', margin: '0 0 2px',
                          fontFamily: "'Cabinet Grotesk', sans-serif",
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {fileName(doc.file_url)}
                        </p>
                        <p style={{ fontSize: 10, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                          {typeLabel(doc.document_type)} · {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: meta.bg, color: meta.colour,
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                        letterSpacing: '0.05em',
                      }}>
                        {meta.label}
                      </span>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#a89070', textDecoration: 'none', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                      >
                        View
                      </a>
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 14, color: '#dc2626', opacity: 0.5, padding: '0 2px',
                          lineHeight: 1,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Privacy note */}
        <p style={{ fontSize: 10, color: '#c4a882', margin: 0, lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          🔒 Documents are stored securely and are only accessible by you and your advisor. Files are encrypted at rest.
        </p>
      </div>
    </div>
  )
}
