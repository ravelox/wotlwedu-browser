{{- define "wotlwedu-browser.labels" -}}
app.kubernetes.io/name: {{ include "wotlwedu-browser.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- with .Chart.AppVersion }}
app.kubernetes.io/version: {{ . | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "wotlwedu-browser.selectorLabels" -}}
app.kubernetes.io/name: {{ include "wotlwedu-browser.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "wotlwedu-browser.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "wotlwedu-browser.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "wotlwedu-browser.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
