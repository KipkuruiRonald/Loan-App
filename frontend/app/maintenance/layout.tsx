export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8E4DC' }}>
      {children}
    </div>
  )
}
