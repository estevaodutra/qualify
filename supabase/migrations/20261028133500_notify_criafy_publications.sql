-- =====================================================
-- MIGRATION: Notificações automáticas de publicações do Criafy
-- Notifica todos os membros da empresa quando um post/story/reels é publicado
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_criafy_publication_published()
RETURNS TRIGGER AS $$
DECLARE
  v_account_username TEXT;
  v_pub_type_label TEXT;
  v_title TEXT;
  v_description TEXT;
  v_link TEXT;
  v_published_time_str TEXT;
  v_member RECORD;
  v_caption_preview TEXT;
  v_member_count INT := 0;
BEGIN
  -- Só processa se o status for alterado para PUBLISHED (ou inserido como PUBLISHED)
  IF (TG_OP = 'UPDATE' AND NEW.status = 'PUBLISHED' AND (OLD.status IS DISTINCT FROM 'PUBLISHED'))
     OR (TG_OP = 'INSERT' AND NEW.status = 'PUBLISHED') THEN

    -- 1. Obter nome da conta do Instagram
    SELECT username INTO v_account_username
    FROM public.criafy_instagram_accounts
    WHERE id = NEW.account_id;

    -- 2. Label amigável do tipo de publicação
    CASE NEW.publication_type
      WHEN 'STORY_VIDEO' THEN v_pub_type_label := 'Story (Vídeo)';
      WHEN 'STORY_IMAGE' THEN v_pub_type_label := 'Story (Imagem)';
      WHEN 'REEL' THEN v_pub_type_label := 'Reels';
      WHEN 'FEED' THEN v_pub_type_label := 'Post no Feed';
      WHEN 'CAROUSEL' THEN v_pub_type_label := 'Carrossel';
      ELSE v_pub_type_label := 'Post (' || COALESCE(NEW.publication_type, 'Instagram') || ')';
    END CASE;

    -- 3. Formatar horário (Horário de Brasília America/Sao_Paulo)
    v_published_time_str := to_char(
      COALESCE(NEW.published_at, now()) AT TIME ZONE 'America/Sao_Paulo',
      'DD/MM/YYYY às HH24:MI'
    );

    -- 4. Título da notificação
    IF v_account_username IS NOT NULL AND v_account_username <> '' THEN
      v_title := v_pub_type_label || ' publicado no @' || v_account_username;
    ELSE
      v_title := v_pub_type_label || ' publicado no Instagram';
    END IF;

    -- 5. Prévia da legenda se houver
    IF NEW.caption IS NOT NULL AND length(trim(NEW.caption)) > 0 THEN
      v_caption_preview := substring(trim(NEW.caption) from 1 for 80);
      IF length(trim(NEW.caption)) > 80 THEN
        v_caption_preview := v_caption_preview || '...';
      END IF;
    END IF;

    -- 6. Montar descrição
    v_description := 'Publicado em ' || v_published_time_str || '.';
    IF v_caption_preview IS NOT NULL THEN
      v_description := v_description || ' "' || v_caption_preview || '"';
    END IF;

    -- 7. Link (permalink do Instagram se houver, ou direcionar para o Criafy)
    v_link := COALESCE(NEW.ig_permalink, '/criafy');

    -- 8. Inserir alerta para cada membro ativo da empresa (se já não houver alerta dessa publicação para esse usuário)
    FOR v_member IN
      SELECT user_id 
      FROM public.company_members 
      WHERE company_id = NEW.company_id 
        AND is_active = true 
        AND user_id IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts 
        WHERE entity = 'criafy_publication:' || NEW.id 
          AND user_id = v_member.user_id
      ) THEN
        v_member_count := v_member_count + 1;
        INSERT INTO public.alerts (
          company_id,
          user_id,
          severity,
          title,
          description,
          entity,
          link,
          read,
          created_at,
          metadata
        ) VALUES (
          NEW.company_id,
          v_member.user_id,
          'success',
          v_title,
          v_description,
          'criafy_publication:' || NEW.id,
          v_link,
          false,
          COALESCE(NEW.published_at, now()),
          jsonb_build_object(
            'publication_id', NEW.id,
            'account_id', NEW.account_id,
            'account_username', v_account_username,
            'publication_type', NEW.publication_type,
            'ig_permalink', NEW.ig_permalink,
            'published_at', NEW.published_at
          )
        );
      END IF;
    END LOOP;

    -- Se não houver membros cadastrados na tabela company_members, insere com user_id nulo para a empresa
    IF v_member_count = 0 AND NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE entity = 'criafy_publication:' || NEW.id 
        AND company_id = NEW.company_id 
        AND user_id IS NULL
    ) THEN
      INSERT INTO public.alerts (
        company_id,
        user_id,
        severity,
        title,
        description,
        entity,
        link,
        read,
        created_at,
        metadata
      ) VALUES (
        NEW.company_id,
        NULL,
        'success',
        v_title,
        v_description,
        'criafy_publication:' || NEW.id,
        v_link,
        false,
        COALESCE(NEW.published_at, now()),
        jsonb_build_object(
          'publication_id', NEW.id,
          'account_id', NEW.account_id,
          'account_username', v_account_username,
          'publication_type', NEW.publication_type,
          'ig_permalink', NEW.ig_permalink,
          'published_at', NEW.published_at
        )
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger na tabela criafy_publications
DROP TRIGGER IF EXISTS trg_notify_criafy_publication ON public.criafy_publications;

CREATE TRIGGER trg_notify_criafy_publication
AFTER INSERT OR UPDATE OF status ON public.criafy_publications
FOR EACH ROW
EXECUTE FUNCTION public.notify_criafy_publication_published();
