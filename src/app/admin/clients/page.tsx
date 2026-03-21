import { redirect } from 'next/navigation'

// /admin/clients redirects to the main CRM — the admin page IS the client list
export default function AdminClientsPage() {
  redirect('/admin')
}
