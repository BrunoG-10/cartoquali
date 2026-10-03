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
          created_at: string
          deseja_contato: boolean
          email_contato: string | null
          id: string
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
          created_at?: string
          deseja_contato?: boolean
          email_contato?: string | null
          id?: string
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
          created_at?: string
          deseja_contato?: boolean
          email_contato?: string | null
          id?: string
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
      ocorrencias_qualidade: {
        Row: {
          avaliacao_id: string | null
          cartorio_id: string
          categoria: string
          created_at: string
          data_abertura: string
          data_resolucao: string | null
          descricao: string
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
          created_at?: string
          data_abertura?: string
          data_resolucao?: string | null
          descricao: string
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
          created_at?: string
          data_abertura?: string
          data_resolucao?: string | null
          descricao?: string
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
          concluido_em: string | null
          created_at: string
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
          concluido_em?: string | null
          created_at?: string
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
          concluido_em?: string | null
          created_at?: string
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
      get_my_cartoquali_context: {
        Args: never
        Returns: {
          auth_user_id: string
          cartorio_id: string
          cartorio_nome: string
          cartorio_status: string
          email: string
          nome: string
          role: string
          telefone: string
          usuario_id: string
          usuario_status: string
        }[]
      }
      has_cartoquali_role: {
        Args: { _auth_user_id: string; _roles: string[] }
        Returns: boolean
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
