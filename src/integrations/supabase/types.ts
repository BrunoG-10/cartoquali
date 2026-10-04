export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          cartorio_id: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          cartorio_id: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          cartorio_id?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_cartorio_id_fkey"
            columns: ["user_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          anonymous: boolean
          atendimento_resolvido: string | null
          cartorio_id: string
          comentario: string | null
          contact_consent_at: string | null
          contact_consent_version: string | null
          created_at: string
          deseja_contato: boolean
          email_contato: string | null
          id: string
          is_test: boolean
          minimized_at: string | null
          motivo_insatisfacao: string | null
          nome_contato: string | null
          nota_geral: number
          pesquisa_id: string
          ponto_id: string
          status: string
          telefone_contato: string | null
        }
        Insert: {
          anonymous?: boolean
          atendimento_resolvido?: string | null
          cartorio_id: string
          comentario?: string | null
          contact_consent_at?: string | null
          contact_consent_version?: string | null
          created_at?: string
          deseja_contato?: boolean
          email_contato?: string | null
          id?: string
          is_test?: boolean
          minimized_at?: string | null
          motivo_insatisfacao?: string | null
          nome_contato?: string | null
          nota_geral: number
          pesquisa_id: string
          ponto_id: string
          status?: string
          telefone_contato?: string | null
        }
        Update: {
          anonymous?: boolean
          atendimento_resolvido?: string | null
          cartorio_id?: string
          comentario?: string | null
          contact_consent_at?: string | null
          contact_consent_version?: string | null
          created_at?: string
          deseja_contato?: boolean
          email_contato?: string | null
          id?: string
          is_test?: boolean
          minimized_at?: string | null
          motivo_insatisfacao?: string | null
          nome_contato?: string | null
          nota_geral?: number
          pesquisa_id?: string
          ponto_id?: string
          status?: string
          telefone_contato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_ponto_id_cartorio_id_pesquisa_id_fkey"
            columns: ["ponto_id", "cartorio_id", "pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pontos_avaliacao"
            referencedColumns: ["id", "cartorio_id", "pesquisa_id"]
          },
        ]
      }
      cartorio_onboarding: {
        Row: {
          activated_at: string | null
          blocked_reason: string | null
          cartorio_id: string
          client_request_id: string
          created_at: string
          created_by_id: string
          current_step: number
          id: string
          point_id: string | null
          status: string
          survey_id: string | null
          test_evaluation_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          blocked_reason?: string | null
          cartorio_id: string
          client_request_id: string
          created_at?: string
          created_by_id: string
          current_step?: number
          id?: string
          point_id?: string | null
          status?: string
          survey_id?: string | null
          test_evaluation_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          blocked_reason?: string | null
          cartorio_id?: string
          client_request_id?: string
          created_at?: string
          created_by_id?: string
          current_step?: number
          id?: string
          point_id?: string | null
          status?: string
          survey_id?: string | null
          test_evaluation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartorio_onboarding_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: true
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartorio_onboarding_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartorio_onboarding_point_tenant_fkey"
            columns: ["point_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "pontos_avaliacao"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "cartorio_onboarding_survey_tenant_fkey"
            columns: ["survey_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "cartorio_onboarding_test_tenant_fkey"
            columns: ["test_evaluation_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id", "cartorio_id"]
          },
        ]
      }
      cartorios: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string
          cnpj: string
          complemento: string | null
          created_at: string
          data_renovacao: string | null
          email: string | null
          endereco: string | null
          estado: string
          id: string
          nome_fantasia: string
          numero: string | null
          plano: string
          razao_social: string
          responsavel: string
          status: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade: string
          cnpj: string
          complemento?: string | null
          created_at?: string
          data_renovacao?: string | null
          email?: string | null
          endereco?: string | null
          estado: string
          id?: string
          nome_fantasia: string
          numero?: string | null
          plano: string
          razao_social: string
          responsavel: string
          status?: string
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string
          cnpj?: string
          complemento?: string | null
          created_at?: string
          data_renovacao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string
          id?: string
          nome_fantasia?: string
          numero?: string | null
          plano?: string
          razao_social?: string
          responsavel?: string
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_cartorio: {
        Row: {
          audit_retention_days: number | null
          cartorio_id: string
          contact_retention_days: number | null
          created_at: string
          evaluation_retention_days: number | null
          formato_data: string
          fuso_horario: string
          id: string
          idioma: string
          mensagem_agradecimento: string
          metodologia_ativa: string
          nome_exibicao: string
          permite_avaliacao_anonima: boolean
          permite_comentarios: boolean
          permite_contato: boolean
          pesquisa_padrao_id: string | null
          privacy_contact_channel: string | null
          privacy_notice_effective_at: string | null
          privacy_notice_version: string
          updated_at: string
        }
        Insert: {
          audit_retention_days?: number | null
          cartorio_id: string
          contact_retention_days?: number | null
          created_at?: string
          evaluation_retention_days?: number | null
          formato_data?: string
          fuso_horario?: string
          id?: string
          idioma?: string
          mensagem_agradecimento?: string
          metodologia_ativa?: string
          nome_exibicao?: string
          permite_avaliacao_anonima?: boolean
          permite_comentarios?: boolean
          permite_contato?: boolean
          pesquisa_padrao_id?: string | null
          privacy_contact_channel?: string | null
          privacy_notice_effective_at?: string | null
          privacy_notice_version?: string
          updated_at?: string
        }
        Update: {
          audit_retention_days?: number | null
          cartorio_id?: string
          contact_retention_days?: number | null
          created_at?: string
          evaluation_retention_days?: number | null
          formato_data?: string
          fuso_horario?: string
          id?: string
          idioma?: string
          mensagem_agradecimento?: string
          metodologia_ativa?: string
          nome_exibicao?: string
          permite_avaliacao_anonima?: boolean
          permite_comentarios?: boolean
          permite_contato?: boolean
          pesquisa_padrao_id?: string | null
          privacy_contact_channel?: string | null
          privacy_notice_effective_at?: string | null
          privacy_notice_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_cartorio_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: true
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_cartorio_pesquisa_padrao_id_fkey"
            columns: ["pesquisa_padrao_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_contacts: {
        Row: {
          cartorio_id: string
          consent_at: string
          consent_version: string
          created_at: string
          email: string | null
          evaluation_id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          cartorio_id: string
          consent_at?: string
          consent_version: string
          created_at?: string
          email?: string | null
          evaluation_id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          cartorio_id?: string
          consent_at?: string
          consent_version?: string
          created_at?: string
          email?: string | null
          evaluation_id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_contacts_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_contacts_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias_qualidade: {
        Row: {
          avaliacao_id: string | null
          cartorio_id: string
          categoria: string
          client_request_id: string | null
          created_at: string
          criado_por_id: string | null
          data_abertura: string
          data_resolucao: string | null
          descricao: string
          encerrado_por_id: string | null
          id: string
          observacao: string | null
          origem: string
          ponto_id: string | null
          prazo: string | null
          prioridade: string
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          avaliacao_id?: string | null
          cartorio_id: string
          categoria: string
          client_request_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          data_abertura?: string
          data_resolucao?: string | null
          descricao: string
          encerrado_por_id?: string | null
          id?: string
          observacao?: string | null
          origem: string
          ponto_id?: string | null
          prazo?: string | null
          prioridade: string
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string | null
          cartorio_id?: string
          categoria?: string
          client_request_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          data_abertura?: string
          data_resolucao?: string | null
          descricao?: string
          encerrado_por_id?: string | null
          id?: string
          observacao?: string | null
          origem?: string
          ponto_id?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_criado_por_tenant_fkey"
            columns: ["criado_por_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "ocorrencias_encerrado_por_tenant_fkey"
            columns: ["encerrado_por_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "ocorrencias_qualidade_avaliacao_id_cartorio_id_fkey"
            columns: ["avaliacao_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "ocorrencias_qualidade_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_qualidade_ponto_id_cartorio_id_fkey"
            columns: ["ponto_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "pontos_avaliacao"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "ocorrencias_qualidade_responsavel_id_cartorio_id_fkey"
            columns: ["responsavel_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
        ]
      }
      opcoes_resposta: {
        Row: {
          created_at: string
          id: string
          ordem: number
          pergunta_id: string
          texto: string
          valor: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem: number
          pergunta_id: string
          texto: string
          valor: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          pergunta_id?: string
          texto?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "opcoes_resposta_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas: {
        Row: {
          ativa: boolean
          condicao: Json | null
          created_at: string
          dimensao: string
          id: string
          obrigatoria: boolean
          ordem: number
          pesquisa_id: string
          texto: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          condicao?: Json | null
          created_at?: string
          dimensao: string
          id?: string
          obrigatoria?: boolean
          ordem: number
          pesquisa_id: string
          texto: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          condicao?: Json | null
          created_at?: string
          dimensao?: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          pesquisa_id?: string
          texto?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas: {
        Row: {
          cartorio_id: string
          configuracoes: Json
          created_at: string
          descricao: string | null
          id: string
          nome: string
          status: string
          updated_at: string
          versao: string
        }
        Insert: {
          cartorio_id: string
          configuracoes?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
          versao?: string
        }
        Update: {
          cartorio_id?: string
          configuracoes?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_melhoria: {
        Row: {
          acao: string
          cartorio_id: string
          client_request_id: string | null
          concluido_em: string | null
          concluido_por_id: string | null
          created_at: string
          criado_por_id: string | null
          dimensao: string | null
          id: string
          indicador_antes: number | null
          indicador_depois: number | null
          indicador_nome: string | null
          objetivo: string
          observacao_resultado: string | null
          ocorrencia_id: string
          ponto_id: string | null
          prazo: string
          prioridade: string
          problema: string
          progresso: number
          responsavel_id: string | null
          resultado: string | null
          resultado_esperado: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          acao: string
          cartorio_id: string
          client_request_id?: string | null
          concluido_em?: string | null
          concluido_por_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          dimensao?: string | null
          id?: string
          indicador_antes?: number | null
          indicador_depois?: number | null
          indicador_nome?: string | null
          objetivo: string
          observacao_resultado?: string | null
          ocorrencia_id: string
          ponto_id?: string | null
          prazo: string
          prioridade?: string
          problema: string
          progresso?: number
          responsavel_id?: string | null
          resultado?: string | null
          resultado_esperado?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          acao?: string
          cartorio_id?: string
          client_request_id?: string | null
          concluido_em?: string | null
          concluido_por_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          dimensao?: string | null
          id?: string
          indicador_antes?: number | null
          indicador_depois?: number | null
          indicador_nome?: string | null
          objetivo?: string
          observacao_resultado?: string | null
          ocorrencia_id?: string
          ponto_id?: string | null
          prazo?: string
          prioridade?: string
          problema?: string
          progresso?: number
          responsavel_id?: string | null
          resultado?: string | null
          resultado_esperado?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_melhoria_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_melhoria_concluido_por_cartorio_fkey"
            columns: ["concluido_por_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "planos_melhoria_criado_por_cartorio_fkey"
            columns: ["criado_por_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "planos_melhoria_ocorrencia_id_cartorio_id_fkey"
            columns: ["ocorrencia_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias_qualidade"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "planos_melhoria_ponto_id_cartorio_id_fkey"
            columns: ["ponto_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "pontos_avaliacao"
            referencedColumns: ["id", "cartorio_id"]
          },
          {
            foreignKeyName: "planos_melhoria_responsavel_id_cartorio_id_fkey"
            columns: ["responsavel_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "cartorio_id"]
          },
        ]
      }
      pontos_avaliacao: {
        Row: {
          cartorio_id: string
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          localizacao: string
          metodo: string
          nome: string
          pesquisa_id: string
          public_slug: string
          status: string
          updated_at: string
        }
        Insert: {
          cartorio_id: string
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          localizacao: string
          metodo?: string
          nome: string
          pesquisa_id: string
          public_slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          cartorio_id?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          localizacao?: string
          metodo?: string
          nome?: string
          pesquisa_id?: string
          public_slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontos_avaliacao_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_avaliacao_pesquisa_id_cartorio_id_fkey"
            columns: ["pesquisa_id", "cartorio_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id", "cartorio_id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          cartorio_id: string
          created_at: string
          created_by_id: string
          description: string
          evaluation_id: string | null
          id: string
          internal_notes: string | null
          request_type: string
          requester_contact: string | null
          resolved_at: string | null
          responsible_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cartorio_id: string
          created_at?: string
          created_by_id: string
          description: string
          evaluation_id?: string | null
          id?: string
          internal_notes?: string | null
          request_type: string
          requester_contact?: string | null
          resolved_at?: string | null
          responsible_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cartorio_id?: string
          created_at?: string
          created_by_id?: string
          description?: string
          evaluation_id?: string | null
          id?: string
          internal_notes?: string | null
          request_type?: string
          requester_contact?: string | null
          resolved_at?: string | null
          responsible_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          avaliacao_id: string
          created_at: string
          id: string
          pergunta_id: string
          resposta_texto: string | null
          valor: Json | null
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          id?: string
          pergunta_id: string
          resposta_texto?: string | null
          valor?: Json | null
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          id?: string
          pergunta_id?: string
          resposta_texto?: string | null
          valor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          auth_user_id: string | null
          cartorio_id: string
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          cartorio_id: string
          created_at?: string
          email: string
          id?: string
          nome: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          cartorio_id?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_improvement_plan: {
        Args: {
          _action: string
          _client_request_id: string
          _dimension?: string
          _due_date: string
          _expected_result?: string
          _objective: string
          _occurrence_id: string
          _priority: string
          _problem: string
          _responsible_id: string
          _title: string
        }
        Returns: Json
      }
      create_quality_occurrence: {
        Args: {
          _category: string
          _client_request_id: string
          _description: string
          _due_date?: string
          _evaluation_id?: string
          _observation?: string
          _origin: string
          _point_id?: string
          _priority: string
          _responsible_id?: string
          _title: string
        }
        Returns: Json
      }
      create_registry_user: {
        Args: {
          _auth_user_id: string
          _email: string
          _name: string
          _phone: string
          _role: string
          _status: string
        }
        Returns: Json
      }
      get_dashboard_indicators: {
        Args: {
          _current_end: string
          _current_start: string
          _granularity?: string
          _point_id?: string
          _previous_end: string
          _previous_start: string
          _survey_id?: string
        }
        Returns: Json
      }
      get_onboarding_checklist: {
        Args: { _cartorio_id: string }
        Returns: Json
      }
      get_onboarding_test_context: {
        Args: { _code: string; _test_token: string }
        Returns: Json
      }
      get_public_evaluation_context: { Args: { _code: string }; Returns: Json }
      get_quality_report: {
        Args: {
          _current_end: string
          _current_start: string
          _granularity?: string
          _occurrence_status?: string
          _plan_status?: string
          _point_id?: string
          _previous_end: string
          _previous_start: string
          _survey_id?: string
        }
        Returns: Json
      }
      log_privacy_event: {
        Args: {
          _action: string
          _entity: string
          _entity_id: string
          _metadata?: Json
        }
        Returns: undefined
      }
      minimize_evaluation_personal_data: {
        Args: {
          _evaluation_id: string
          _privacy_request_id: string
          _redact_free_text?: boolean
        }
        Returns: Json
      }
      submit_onboarding_test_evaluation: {
        Args: {
          _answers: Json
          _code: string
          _idempotency_key: string
          _source_hash: string
          _test_token: string
        }
        Returns: Json
      }
      submit_public_evaluation: {
        Args: {
          _answers: Json
          _code: string
          _contact?: Json
          _idempotency_key: string
          _source_hash: string
        }
        Returns: Json
      }
      update_improvement_plan: {
        Args: {
          _action: string
          _due_date: string
          _expected_result: string
          _expected_updated_at: string
          _id: string
          _indicator_after: number
          _indicator_before: number
          _indicator_name: string
          _objective: string
          _priority: string
          _problem: string
          _progress: number
          _responsible_id: string
          _result: string
          _result_observation: string
          _status: string
          _title: string
        }
        Returns: Json
      }
      update_quality_occurrence: {
        Args: {
          _category: string
          _description: string
          _due_date: string
          _expected_updated_at: string
          _id: string
          _observation: string
          _priority: string
          _responsible_id: string
          _status: string
          _title: string
        }
        Returns: Json
      }
      update_registry_user: {
        Args: {
          _id: string
          _name: string
          _phone: string
          _role: string
          _status: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
