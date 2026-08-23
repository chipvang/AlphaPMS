namespace AlphaPMS.Application.Common;

public sealed class ApplicationException(string code, string message, ApplicationErrorKind kind) : Exception(message)
{
    public string Code { get; } = code;
    public ApplicationErrorKind Kind { get; } = kind;
}

public enum ApplicationErrorKind { Validation, NotFound, Conflict }
