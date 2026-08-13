import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function confirmUserEmail() {
  const email = 'qualifys.app@gmail.com'
  
  console.log(`Buscando usuário ${email}...`)
  
  const { data, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error("Erro ao listar usuários:", error)
    return
  }
  
  const user = data.users.find(u => u.email === email)
  
  if (user) {
    console.log(`Usuário encontrado: ${user.email}`)
    console.log(`Email confirmado em: ${user.email_confirmed_at || 'NÃO CONFIRMADO'}`)
    
    if (!user.email_confirmed_at) {
      console.log('Confirmando o email automaticamente agora...')
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      )
      
      if (updateError) {
        console.error("Erro ao confirmar email:", updateError.message)
      } else {
        console.log("✅ Email confirmado com sucesso!")
      }
    } else {
      console.log("O email já estava confirmado. O problema não é esse.")
    }
  } else {
    console.log("Usuário não encontrado.")
  }
}

confirmUserEmail()
