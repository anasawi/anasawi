import type { Metadata } from 'next'

import { CarnetAccompagnements, CarnetBarre, CarnetCabinet, CarnetCitation, CarnetContact, CarnetCouverture, CarnetMethode, CarnetPied, CarnetQui, CarnetQuestions } from '@/components/anasawi/carnet'
import { chargerContenu } from '@/components/anasawi/charger'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ANASAWI — direction Carnet',
}

/** La direction « Carnet » : une page complète, section par section. */
export default async function CarnetPage() {
  const c = await chargerContenu()
  return (
    <>
      <CarnetBarre c={c} />
      <main>
        <CarnetCouverture c={c} />
        <CarnetQui c={c} />
        <CarnetMethode c={c} />
        <CarnetAccompagnements c={c} />
        <CarnetCabinet c={c} />
        <CarnetQuestions c={c} />
        <CarnetCitation c={c} />
        <CarnetContact c={c} />
      </main>
      <CarnetPied c={c} />
    </>
  )
}
