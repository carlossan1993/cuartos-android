import { useTranslation } from 'react-i18next'
import type { Room } from '../domain/types'
import { layoutConnections } from '../geometry/layout'

export function ConnectionSummary({ rooms }: { rooms: readonly Room[] }) {
  const { t, i18n } = useTranslation(), connections = layoutConnections(rooms)
  return connections.length ? <div className="connection-summary"><p>{t('layout.openHelp')}</p><ul>{connections.map((connection, i) => <li key={i}>{t('layout.connection', { first: rooms.find(room => room.id === connection.roomId)!.name, second: rooms.find(room => room.id === connection.otherRoomId)!.name, width: new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 4 }).format(connection.width) })}</li>)}</ul></div> : null
}
