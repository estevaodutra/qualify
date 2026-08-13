import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testLogin() {
  const email = 'qualifys.app@gmail.com'
  const password = 'carvalho159'
  
  console.log(`Testando login com ${email} ...`)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.error("Erro no login:", error.message)
    console.log("Detalhes do erro:", error)
  } else {
    console.log("✅ Login bem-sucedido! O usuário existe e a senha está correta.")
    console.log("Token gerado:", data.session?.access_token?.substring(0, 20) + "...")
  }
}

testLogin()
