// src/app/page.tsx - V1 → artık /v2'ye yönlendiriyor
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/v2');
}
